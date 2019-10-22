import Vue from 'vue';
import { EventName } from './Common/EnumEventName';
import { ISearchResult } from './Common/ISearchResult';
import { EnumListType } from './DocStructure/EnumListStyle';
import Editor from './Editor';

// https://jsbin.com/jimezacabu/edit?html,js,output
const template = `
  <div class="toolbar">
    <button @mousedown.prevent="preventMousedown" v-bind:disabled="!canUndo" @click="onUndo">Undo</button>
    <button @mousedown.prevent="preventMousedown" v-bind:disabled="!canRedo" @click="onRedo">Redo</button>
    <button class="btnClearFormat" @mousedown.prevent="preventMousedown" @click="onClearFormat">clear</button>
    <select id="selTitle" @change="onSetTitle">
      <option value="text">正文</option>
      <option value="title">标题</option>
      <option value="subtitle">副标题</option>
      <option value="header1">标题1</option>
      <option value="header2">标题2</option>
      <option value="header3">标题3</option>
    </select>
    <select id="selFont" v-model="format.font" @change="onSetFont">
      <option value="Default">默认字体</option>
      <option value="simsun">宋体</option>
      <option value="simhei">黑体</option>
      <option value="Weiruanyahei">微软雅黑</option>
      <option value="fangsong">仿宋</option>
      <option value="kaiti">楷体</option>
      <option value="arial">arial</option>
      <option value="droid">droid</option>
      <option value="source">source</option>
    </select>
    <select id="selSize" v-model="format.size" @change="onSetSize">
      <option value="9">9</option>
      <option value="10">10</option>
      <option value="11">11</option>
      <option value="12">12</option>
      <option value="14">14</option>
      <option value="16">16</option>
      <option value="18">18</option>
      <option value="22">22</option>
      <option value="24">24</option>
      <option value="30">30</option>
      <option value="36">36</option>
    </select>
    <button @mousedown.prevent="preventMousedown" @click="onSetBold" v-bind:class="{'btnSelected': format.bold, 'btnBold': true}">B</button>
    <button @mousedown.prevent="preventMousedown" @click="onSetItalic" v-bind:class="{'btnSelected': format.italic, 'btnItalic': true}">I</button>
    <button @mousedown.prevent="preventMousedown" @click="onSetUnderline" v-bind:class="{'btnSelected': format.underline, 'btnUnderline': true}">U</button>
    <button @mousedown.prevent="preventMousedown" @click="onSetStrike" v-bind:class="{'btnSelected': format.strike, 'btnStrike': true}">S</button>
    <button @mousedown.prevent="preventMousedown" @click="onSetColor" class="btnColor" :style="{color:format.color}">C</button>
    <button @mousedown.prevent="preventMousedown" @click="onSetHighlight" class="btnHighlight" :style="{background:format.background}">H</button>
    <select id="selList" v-model="format.listType" @change="onSetList">
      <option value='-1'>none</option>
      <option value="0">1. a. i. 1.</option>
      <option value="1">一、 a). i. 1.</option>
      <option value="2">1. 1.1. 1.1.1. 1.1.1.1.</option>
      <option value="3">•  ◦  ▪  ▫</option>
      <option value="4">⦿ ⦿ ⦿ ⦿</option>
      <option value="5">→ ▴ ▪ •</option>
    </select>
    <button @mousedown.prevent="preventMousedown" @click="onSetIndentRight" class="btnIndentRight">向右</button>
    <button @mousedown.prevent="preventMousedown" @click="onSetIndentLeft" class="btnIndentLeft">向左</button>
    <select id="selAlign" v-model="format.align" @change="onSetAlign">
      <option value="left">左对齐</option>
      <option value="center">居中</option>
      <option value="right">右对齐</option>
      <option value="justify">两端对齐</option>
      <option value="scattered">分散对齐</option>
    </select>
    <select v-model="format.linespacing" @change="onSetLinespacing">
      <option value="100">1.0</option>
      <option value="115">1.15</option>
      <option value="150">1.5</option>
      <option value="200">2.0</option>
      <option value="250">2.5</option>
      <option value="300">3.0</option>
    </select>
    <button @mousedown.prevent="preventMousedown" @click="onSetQuoteBlock" class="btnQuoteBlock">引用块</button>
    <br>
    <input id="searchKeywords" type="text" v-model="searchKeywords" placeholder="search"/>
    <button @mousedown.prevent="preventMousedown" @click="onSearch">查找</button>
    <span v-if="searchResultCurrentIndex !== undefined">{{searchResultCurrentIndex + 1}}/{{searchResultCount}}</span>
    <input id="searchReplaceKeywords" type="text" v-model="searchReplaceKeywords" placeholder="replace"/>
    <button @mousedown.prevent="preventMousedown" @click="onReplace">替换</button>
    <button @mousedown.prevent="preventMousedown" @click="onReplaceAll">替换全部</button>
    <button @mousedown.prevent="preventMousedown" @click="onClearSearch">清除查找</button>
    <button @mousedown.prevent="preventMousedown" @click="onPrevSearchResult">prev</button>
    <button @mousedown.prevent="preventMousedown" @click="onNextSearchResult">next</button>
  </div>
`;

export default function(toolbarPlaceholder: HTMLElement, editor: Editor): void {
  const toolbar = new Vue({
    el: toolbarPlaceholder,
    template,
    data: {
      format: {},
      canUndo: false,
      canRedo: false,
      searchKeywords: '',
      searchReplaceKeywords: '',
      searchResultCount: 0,
      searchResultCurrentIndex: undefined,
    },
    methods: {
      preventMousedown() { /** empty function */ },
      randomColor() {
        const colorValues = [
          Math.floor(Math.random() * 256).toString(16),
          Math.floor(Math.random() * 256).toString(16),
          Math.floor(Math.random() * 256).toString(16),
        ];
        const color = '#' + colorValues.map((v: string) => v.length === 2 ? v : '0' + v).join('');
        return color;
      },
      onChangeRedoUndoStatus(status: {canRedo: boolean, canUndo: boolean}) {
        this.canRedo = status.canRedo;
        this.canUndo = status.canUndo;
      },
      onEditorChangeFormat(format: { [key: string]: Set<any> }) {
        const toolbarFormat: { [key: string]: any } = {};
        const formatKeys = Object.keys(format);
        formatKeys.forEach((formatName) => {
          if (format[formatName] && format[formatName].size === 1) {
            toolbarFormat[formatName] = format[formatName].values().next().value;
          }
        });
        toolbarFormat.listType = toolbarFormat.listType || '-1';
        this.$set(this.$data, 'format', toolbarFormat);
      },
      onClearFormat() {
        editor.clearFormat();
      },
      onSetTitle() { console.log('on SetTitle'); },
      onSetFont(event: Event) { console.log('set font'); editor.format({ font: (event.srcElement as HTMLSelectElement).value }); },
      onSetSize(event: Event) {
        editor.format({ size: parseInt((event.srcElement as HTMLSelectElement).value, 10) });
      },
      onSetBold() { console.log('on SetBold'); editor.format({ bold: !(this.format as any).bold }); },
      onSetItalic() { console.log('on SetItalic'); editor.format({ italic: !(this.format as any).italic }); },
      onSetUnderline() { console.log('on SetUnderline'); editor.format({ underline: !(this.format as any).underline }); },
      onSetStrike() { console.log('on SetStrike'); editor.format({ strike: !(this.format as any).strike }); },
      onSetColor() {
        let color = '#494949';
        if ((this.format as any).color === color) {
          color = this.randomColor();
        }
        editor.format({ color });
      },
      onSetHighlight() {
        let background = '#ffffff';
        if ((this.format as any).background === background) {
          background = this.randomColor();
        }
        editor.format({ background });
      },
      onSetList(event: Event) {
        console.log('on SetList');
        const newValue = (event.srcElement as HTMLSelectElement).value;
        if (newValue === '-1') {
          editor.setParagraph();
        } else {
          editor.setList(newValue as EnumListType);
        }
      },
      onSetIndentRight() { console.log('on SetIndentRight'); editor.setIndent(true); },
      onSetIndentLeft() { console.log('on SetIndentLeft'); editor.setIndent(false); },
      onSetAlign(event: Event) { console.log('on SetAlign '); editor.format({ align: (event.srcElement as HTMLSelectElement).value }); },
      onSetLinespacing(event: Event) { console.log('on SetLinespacing'); editor.format({ linespacing: (event.srcElement as HTMLSelectElement).value }); },
      onSetQuoteBlock() { console.log('on SetQuoteBlock'); editor.setQuoteBlock(); },
      onSearch() { console.log('on Search '); editor.search(this.searchKeywords); },
      onReplace() { console.log('on Replace '); editor.replace(this.searchReplaceKeywords); },
      onReplaceAll() { editor.replace(this.searchReplaceKeywords, true); },
      onClearSearch() { console.log('on Clear Search'); editor.clearSearch(); },
      onPrevSearchResult() { editor.prevSearchResult(); },
      onNextSearchResult() { editor.nextSearchResult(); },
      onEditorChangeSearchResult(results: ISearchResult[], currentIndex: number) {
        this.searchResultCount = results.length;
        (this.searchResultCurrentIndex as any) = currentIndex;
      },
      onRedo() { editor.redo(); },
      onUndo() { editor.undo(); },
    },
    mounted() {
      editor.em.on(EventName.EDITOR_CHANGE_FORMAT, this.onEditorChangeFormat);
      editor.em.on(EventName.EDITOR_CHANGE_SEARCH_RESULT, this.onEditorChangeSearchResult);
      editor.em.on(EventName.EDITOR_CHANGE_HISTORY_STACK, this.onChangeRedoUndoStatus);
    },
  });
}

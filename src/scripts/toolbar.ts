import Vue from 'vue'
import { ISearchResult } from './Common/ISearchResult'

// https://jsbin.com/jimezacabu/edit?html,js,output
const template = `
  <div class="toolbar">
    <button @mousedown.prevent="preventMousedown" v-bind:disabled="!canUndo" @click="onUndo">Undo</button>
    <button @mousedown.prevent="preventMousedown" v-bind:disabled="!canRedo" @click="onRedo">Redo</button>
    <span v-if="stackDepth > 0">{{currentStackIndex + 1}}/{{stackDepth}}</span>
    <button class="btnClearFormat" @mousedown.prevent="preventMousedown" @click="onClearFormat">clear</button>
    <select id="selTitle" @change="onSetTitle">
      <option value="-1">正文</option>
      <option value="0">标题</option>
      <option value="1">副标题</option>
      <option value="2">标题1</option>
      <option value="3">标题2</option>
      <option value="4">标题3</option>
      <option value="5">标题4</option>
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
      <option value="1.7">1.0</option>
      <option value="2">1.15</option>
      <option value="2.5">1.5</option>
      <option value="3.4">2.0</option>
      <option value="4.3">2.5</option>
      <option value="5.1">3.0</option>
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
    <input id="linkUrl" type="text" v-model="linkUrl" />
    <button @mousedown.prevent="preventMousedown" @click="onSetLink">设置链接</button>
  </div>
`

export default function(toolbarPlaceholder: HTMLElement) {
  return new Vue({
    el: toolbarPlaceholder,
    template,
    data: {
      format: {},
      canUndo: false,
      canRedo: false,
      stackDepth: 0,
      currentStackIndex: 0,
      searchKeywords: '',
      searchReplaceKeywords: '',
      searchResultCount: 0,
      searchResultCurrentIndex: undefined,
      linkUrl: '',
    },
    methods: {
      preventMousedown() { /** empty function */ },
      randomColor() {
        const colorValues = [
          Math.floor(Math.random() * 256).toString(16),
          Math.floor(Math.random() * 256).toString(16),
          Math.floor(Math.random() * 256).toString(16),
        ]
        const color = '#' + colorValues.map((v: string) => v.length === 2 ? v : '0' + v).join('')
        return color
      },
      setSearchResult(results: ISearchResult[], currentIndex: number | undefined) {
        this.searchResultCount = results.length;
        (this.searchResultCurrentIndex as any) = currentIndex
      },
      setRedoUndoStatus(status: {canRedo: boolean, canUndo: boolean, stackDepth: number, current: number}) {
        this.canRedo = status.canRedo
        this.canUndo = status.canUndo
        this.stackDepth = status.stackDepth
        this.currentStackIndex = status.current
      },
      setCurrentFormat(format: { [key: string]: Set<any> }) {
        const toolbarFormat: { [key: string]: any } = {}
        const formatKeys = Object.keys(format)
        formatKeys.forEach((formatName) => {
          if (format[formatName] && format[formatName].size === 1) {
            toolbarFormat[formatName] = format[formatName].values().next().value
          }
        })
        toolbarFormat.listType = toolbarFormat.listType ?? '-1'
        this.$set(this.$data, 'format', toolbarFormat)
      },
      onClearFormat() {
        this.$emit('clearFormat')
      },
      onSetTitle(event: Event) {
        this.$emit('format', { title: parseInt((event.srcElement as HTMLSelectElement).value, 10) })
      },
      onSetFont(event: Event) {
        console.log('set font')
        this.$emit('format', { font: (event.srcElement as HTMLSelectElement).value })
      },
      onSetSize(event: Event) {
        this.$emit('format', { size: parseInt((event.srcElement as HTMLSelectElement).value, 10) })
      },
      onSetBold() {
        console.log('on SetBold')
        this.$emit('format', { bold: !(this.format as any).bold })
      },
      onSetItalic() {
        console.log('on SetItalic')
        this.$emit('format', { italic: !(this.format as any).italic })
      },
      onSetUnderline() {
        console.log('on SetUnderline')
        this.$emit('format', { underline: !(this.format as any).underline })
      },
      onSetStrike() {
        console.log('on SetStrike')
        this.$emit('format', { strike: !(this.format as any).strike })
      },
      onSetColor() {
        let color = '#494949'
        if ((this.format as any).color === color) {
          color = this.randomColor()
        }
        this.$emit('format', { color })
      },
      onSetHighlight() {
        let background = '#ffffff'
        if ((this.format as any).background === background) {
          background = this.randomColor()
        }
        this.$emit('format', { background })
      },
      onSetList(event: Event) {
        console.log('on SetList')
        const newValue = parseInt((event.srcElement as HTMLSelectElement).value)
        if (newValue === -1) {
          this.$emit('setParagraph')
        } else {
          this.$emit('setList', newValue)
        }
      },
      onSetIndentRight() {
        console.log('on SetIndentRight')
        this.$emit('indent', true)
      },
      onSetIndentLeft() {
        console.log('on SetIndentLeft')
        this.$emit('indent', false)
      },
      onSetAlign(event: Event) {
        console.log('on SetAlign ')
        this.$emit('format', { align: (event.srcElement as HTMLSelectElement).value })
      },
      onSetLinespacing(event: Event) {
        console.log('on SetLinespacing')
        this.$emit('format', { linespacing: (event.srcElement as HTMLSelectElement).value })
      },
      onSetQuoteBlock() {
        console.log('on SetQuoteBlock')
        this.$emit('setQuoteBlock')
      },
      onSearch() {
        console.log('on Search ', this.searchKeywords)
        this.$emit('search', this.searchKeywords)
      },
      onReplace() {
        console.log('on Replace ')
        this.$emit('replace', this.searchReplaceKeywords)
      },
      onReplaceAll() {
        console.log('on Replace All')
        this.$emit('replace', this.searchReplaceKeywords, true)
      },
      onClearSearch() {
        console.log('on Clear Search')
        this.$emit('clearSearch')
      },
      onPrevSearchResult() {
        this.$emit('prevSearchResult')
      },
      onNextSearchResult() {
        this.$emit('nextSearchResult')
      },
      onSetLink() {
        console.log('on SetLink')
        this.$emit('format', { link: this.linkUrl })
      },
      onRedo() {
        this.$emit('redo')
      },
      onUndo() {
        this.$emit('undo')
      },
    },
  })
}

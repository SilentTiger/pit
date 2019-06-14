import Vue from 'vue';
import { EventName } from './Common/EnumEventName';
import Editor from './Editor';

const template = `
  <div class="toolbar">
    <button class="btnClearFormat">clear</button>
    <select id="selFont">
      <option value="text">正文</option>
      <option value="title">标题</option>
      <option value="subtitle">副标题</option>
      <option value="header1">标题1</option>
      <option value="header2">标题2</option>
      <option value="header3">标题3</option>
    </select>
    <select id="selFont">
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
    <select id="selSize" v-model="format.size">
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
    <button v-bind:class="{'btnSelected': format.bold, 'btnBold': true}" data-attr="bold">B</button>
    <button v-bind:class="{'btnSelected': format.italic, 'btnItalic': true}" data-attr="italic">I</button>
    <button v-bind:class="{'btnSelected': format.underline, 'btnUnderline': true}" data-attr="underline">U</button>
    <button v-bind:class="{'btnSelected': format.strike, 'btnStrike': true}" data-attr="strike">S</button>
    <button class="btnColor" data-attr="color">C</button>
    <button class="btnHighlight" data-attr="highlight">H</button>
    <select id="selList">
      <option value="">none</option>
      <option value="">1. a. i. 1.</option>
      <option value="">一、 a). i. 1.</option>
      <option value="">1. 1.1. 1.1.1. 1.1.1.1.</option>
      <option value="">•  ◦  ▪  ▫</option>
      <option value="">⦿ ⦿ ⦿ ⦿</option>
      <option value="">→ ▴ ▪ •</option>
    </select>
    <button class="btnIndentRight" data-attr="indentRight">向右</button>
    <button class="btnIndentLeft" data-attr="indentLeft">向左</button>
    <select id="selAlign" v-model="format.align">
      <option value="left">左对齐</option>
      <option value="center">居中</option>
      <option value="right">右对齐</option>
      <option value="justify">两端对齐</option>
      <option value="scattered">分散对齐</option>
    </select>
    <select v-model="format.linespacing">
      <option value="100">1.0</option>
      <option value="115">1.15</option>
      <option value="150">1.5</option>
      <option value="200">2.0</option>
      <option value="250">2.5</option>
      <option value="300">3.0</option>
    </select>
  </div>
`;

export default function(toolbarPlaceholder: HTMLElement, editor: Editor): void {
  const toolbar = new Vue({
    el: toolbarPlaceholder,
    template,
    data: {
      format: {},
    },
    methods: {
      onEditorChangeFormat(format: { [key: string]: Set<any> }) {
        const toolbarFormat: {[key: string]: any} = {};
        const formatKeys = Object.keys(format);
        formatKeys.forEach((formatName) => {
          if (format[formatName] && format[formatName].size === 1) {
            toolbarFormat[formatName] = format[formatName].values().next().value;
          }
        });
        this.$set(this.$data, 'format', toolbarFormat);
        this.$nextTick(() => {
          console.log('f ' , format);
        });
      },
    },
    mounted() {
      editor.em.on(EventName.EDITOR_CHANGE_FORMAT, this.onEditorChangeFormat);
    },
  });
}

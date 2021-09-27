import bounds from 'binary-search-bounds'

/**
 * 格式类型枚举
 */
enum EnumTitle {
  Text = -1, // 正文
  Title, // 标题
  Subtitle, // 副标题
  H1, // 标题 1
  H2, // 标题 2
  H3, // 标题 3
  H4, // 标题 4
}

const fontList = [
  {
    name: 'Default',
    value:
      'BlinkMacSystemFont,"PingFang SC",Helvetica,Tahoma,Arial,"Hiragino Sans GB","Microsoft YaHei","\\5FAE\\8F6F\\96C5\\9ED1",sans-serif',
  },
  { name: 'simsun', value: 'SimSun,STSong,sans-serif' },
  { name: 'simhei', value: 'SimHei,STHeiti,sans-serif' },
  { name: 'Weiruanyahei', value: 'Weiruanyahei' },
  { name: 'fangsong', value: 'FangSong,STFangsong,sans-serif' },
  { name: 'kaiti', value: 'KaiTi,STKaiti,sans-serif' },
  { name: 'arial', value: 'Arial,sans-serif' },
  { name: 'droid', value: '"Droid Serif",sans-serif' },
  { name: 'source', value: '"Source Code Pro",sans-serif' },
]

const fontNameToValueMap = [...fontList].sort((a, b) => {
  return a.name > b.name ? 1 : -1
})
const fontValueToNameMap = [...fontList].sort((a, b) => {
  return a.value > b.value ? 1 : -1
})

const EnumFont = {
  getFontValue(fontName: string): string {
    const resIndex = bounds.eq(fontNameToValueMap, { name: fontName, value: '' }, (a, b) => {
      return a.name > b.name ? 1 : a.name < b.name ? -1 : 0
    })
    if (resIndex >= 0 && resIndex < fontList.length) {
      return fontNameToValueMap[resIndex].value
    } else {
      return fontList[0].value
    }
  },
  getFontName(fontValue: string): string {
    const resIndex = bounds.eq(fontValueToNameMap, { name: '', value: fontValue }, (a, b) => {
      return a.value > b.value ? 1 : a.value < b.value ? -1 : 0
    })
    if (resIndex >= 0 && resIndex < fontList.length) {
      return fontValueToNameMap[resIndex].name
    } else {
      return fontList[0].name
    }
  },
}

export { EnumTitle, EnumFont }

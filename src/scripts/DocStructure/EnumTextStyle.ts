/**
 * 格式类型枚举
 */
enum EnumTitle {
  Title,      // 标题
  Subtitle,   // 副标题
  H1,         // 标题 1
  H2,         // 标题 2
  H3,         // 标题 3
  Text,       // 正文
}

const enumFont = new Map()
enumFont.set('Default', '-apple-system,BlinkMacSystemFont,"PingFang SC",Helvetica,Tahoma,Arial,"Hiragino Sans GB","Microsoft YaHei","\\5FAE\\8F6F\\96C5\\9ED1",sans-serif')
enumFont.set('simsun', 'SimSun,STSong,sans-serif')
enumFont.set('simhei', 'SimHei,STHeiti,sans-serif')
enumFont.set('Weiruanyahei', 'Weiruanyahei')
enumFont.set('fangsong', 'FangSong,STFangsong,sans-serif')
enumFont.set('kaiti', 'KaiTi,STKaiti,sans-serif')
enumFont.set('arial', 'Arial,sans-serif')
enumFont.set('droid', '"Droid Serif",sans-serif')
enumFont.set('source', '"Source Code Pro",sans-serif')

export { EnumTitle, enumFont as EnumFont }

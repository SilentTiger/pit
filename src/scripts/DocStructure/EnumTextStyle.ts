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

enum EnumFont {
// tslint:disable-next-line: max-line-length
  Default = '-apple-system,BlinkMacSystemFont,"PingFang SC",Helvetica,Tahoma,Arial,"Hiragino Sans GB","Microsoft YaHei","\\5FAE\8F6F\96C5\9ED1",sans-serif',
  simsun = 'SimSun,STSong,sans-serif',
  simhei = 'SimHei,STHeiti,sans-serif',
  Weiruanyahei = 'Weiruanyahei',
  fangsong = 'FangSong,STFangsong,sans-serif',
  kaiti = 'KaiTi,STKaiti,sans-serif',
  arial = 'Arial,sans-serif',
  droid = '"Droid Serif",sans-serif',
  source = '"Source Code Pro",sans-serif',
}

export {EnumTitle, EnumFont};

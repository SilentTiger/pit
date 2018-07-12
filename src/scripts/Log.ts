export default class Logger {
  private static logContainer = document.getElementById("divLog");

  public static info(msg: string) {
    this.logContainer.appendChild(this.buildMsgLine(msg, MsgType.Info));
    this.logContainer.appendChild(this.buildBr());
  }

  public static error(msg: string) {
    this.logContainer.appendChild(this.buildMsgLine(msg, MsgType.Error));
    this.logContainer.appendChild(this.buildBr());
  }

  private static buildMsgLine(msg: string, type: MsgType) {
    const msgSpan = document.createElement("span");
    msgSpan.innerText += `${Date.now()} ${type} ${msg}`;
    msgSpan.classList.add(type);
    return msgSpan;
  }

  private static buildBr() {
    return document.createElement("br");
  }
}

enum MsgType {
  Info = "info",
  Error = "error",
}

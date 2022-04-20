const UnicodeTrie = require('unicode-trie')
const base64 = require('base64-js')
const { BK, CR, LF, NL, SG, WJ, SP, ZWJ, BA, HY, NS, AI, AL, CJ, HL, RI, SA, XX } = require('./classes')
const { DI_BRK, IN_BRK, CI_BRK, CP_BRK, PR_BRK, pairTable } = require('./pairs')

const data = base64.toByteArray(
  'AAgOAAAAAACA3QAAAe0OEvHtnXuMXUUdx+d2d2/33r237V3YSoFC11r6IGgbRFBEfFF5KCVCMYKFaKn8AYqmwUeqECFabUGQipUiNCkgSRElUkKwJRWtwSpJrZpCI4E2NQqiBsFGwWL8Tu6Md3Z23o9zbund5JM5c+b1m9/85nnOuXtTHyFrwXpwL9gBngTPgj+Dv4H9Ae4B0N9PSAMcDqaB0X57urmIs8AQ72SEnQ4+ABaBxWAJWAquENJ9BtdfANeCleBGcCv4NvgeuBv8AGwCm8FWlpbzOPw7wC7wFNgDngMvgpfAq2DCACF10ACHgaPAzIF2+PFwT2Th1P8OuO8FZ4MPggvAxWAp+A6VHe5ysILFvx7u6oF2+Wvg3g7uYvlT+TbC/TH4CdgCtoGtfW3/E2An8++Gu5eleR7uP8B+8BoLf4LFH6i23Vp1rB5a1Q7TGMeCUYYY18RcxF0gxT8H5b3dIw8X3iPkdxauPwQWgyVgWbVT30/h+mrwZan8r8L/FcEWVsJ/E1grpKXcwdLdI9y/H9cPgUerbbun0PadCHcbjQd+D55mafcx9y9wXwKvCLJUJiLdRH09ef4xupqE/KeCY8Bx4M3gbeBdYCE4G3wYXASWgGXgSibTcuaugHs9WA3WgNvBBha2Ee4D4GFNPTYL9x/D9XaJXwnXvwW7wDPgTzQd2A9eAwODhDTBCJgOZoETwEngtEFmF3DPAouY/0K4Swb9dbaMpbkS7nKP9CsCyrpOSrNK8K9kNnYL7q0DGwbb/XnjoDv3gQfBZvBz8GvwO/AHdr3Pkv4F4fplj3J79OgRBx8HypajR48ePXr06NGjx8HFv7pABhX/HRx7HqKjr9Y+y6PXg7X2WRoPm1Kzpz8CcWaweLPhHt/fPq95C65PZnmfDnchOLfWPo/7OLgQ15ewdJ+E++na2PMhyudw72bDGc01CP8aWAm+Dr4BVoHV4IZeWC+sF9YL64UlD1sD1oE7au0z0zK5p1YuZde/R49uJnYdez/62EPgkVr4c7pHkfYXivTbcW8n2A32gOekOH+F/5/gAOivE9IArXpbrmlwR+vljz9bJrV552RCvgQ2GXgRzJ9CyGVTxofdLd17Gv6jW4RcAG5ote/9FO4B8NZhQs4DN4O9kOFY6OFSsB48C/qGCFkAyERCzh9q+0WuA2sqHX4m+Smv4t6RjXYelItwvQ7sBtOahHwU3NYcn+5Q4pFmRz89evTocajxStM898/FfLSgrg8/sT5+zcLDTkXY+6S0C+E/l907SXO+Rt/Lujrxe1kmztPU70JDvSmXILwJWS9TxLuC3VtuycPGCoV+VfD41yvKW6W4d1O9/S5YtZ+Qtbi+k/m/D/eHYBPzb4G7DfyS+enZ42/qnXPFp+pjZdgD/yX0XcV6+93DF+H+G5AhtcxPIs/BoY5cg0g7RRGXx/8Ewo8Y6vhp/Bnwz2F5zId7CgunZ6Dv1uTF0585pNY7P9NdhPCPDI1Ncyn8l4OrwHKwguVB12WrNPnpoPW5BWluA3eCuxRl3cfyfFCom43NBjkeQ9h2Tzlzs7PL5CmD3UwHew26+KMm7AVHu8hJaL1fTtj29L3E/wi6oPvWvkY7bAjucKOYtpymKWdGo/3e5KxGR8YTGvmfZ4XW46RGmnMIG6excs6Ae46nPuh7pGXbvm/fOB91vLhRXvkmlkKuK8BnFTb8xYL6TyqugbzXJZCZ9tlVrO9+C+53G5134A8G1htsjdbvXoT/KEBPmwq04dS2v6UxNnxbAXV5gul4Z6J+tMtBZtv4+Qzy2Ndof+fwPHP/zsbg/QFz02tIM4B9ZRO0mp379NxxBpgD5gv3T8H16eAMcCZYxMIWw/2YEG8pri9n/qvgfr45fm67VtjPzmbpVrJ7NzL3VrjvF/Jdh+sN3M/cB+A+LOV/bVNdX13b0G9KtmrSHCo8jvqfGjFu7WiWP37E8s2+yv8ZwVbYRgvMAm9kvMkhjStzAZbIBGIR+ngAy2NSZ9f0Hv2bIIShCckU5k5sb+OdGGQ0BKqSPzeE1WFCgWXK5dO2rDD/COn9zTvEUfXJ4zT3c9DP2oH2+ZoAtc9RBr/mY0SLdGyap+Nxh6W0In2Sn5C8/W00c/7dXn63we1DtAHud9WZbFNimmFL2iIoqt8eDPQHptERIkNoO8prFVvblm13OaG6oGM+n7P4/RrRz2HdTktotxHFdZW5tvm72UWEtm9dQF6n++hU1FmVFL++L2Nsdt3/1IVrWaacda4Se91t+pHDVXF5HFd9pG7X14NNyePr6wkfPTRI+H6qDPvLqRM5DR2beZ8W95Divq0IWXXyy/d18Yq09ZhyY/fyPjafY37yta8ybD9l3W15+crXYhQ5rsj2Wkb7iDadon1c+tKI4p5NR6HjPl/vqvLm92uK8lTjWNntkwJTu9hkiJmHVf3S1V5UOii6PWL1nVqOkP5QI/b2L2o+Kqr/h9i0bHNl9HudnKn0btKBbZzItQ7n47Drmutg6P+ubZK7/5va0PU8XZS56DP4Isci07gUo3/fscdlfMyp6xR6dy0vt/275K1bJ8qkHI99bdK3v4vt4Gtzs7sEWa5aZH4NDz3yfWG368bXLlQ6GZYQ7/UL1y3mryroZ+nkZwK28SD1vlt+7sNd+lcR3Ji1RKq1WcvhftFzousYxftH7Ngu2pZubcGfD8eMizp5Y/uha/m69NNK5siSOapkcq2lTOOGvE4y9aPclFl20eXTvwoZO374ymob90Jx3Zfk2h/I849q7VNE+WXsj+ZFlJ96Xcd1PyD4ue2J69/Q9V+u9uPrQC7/sHRftjE+n+eQP2Ztl5Kc+0TX/WND8vP2iF23xO7lfO3XtKfLhUm/PE6Ze78RD/3Fknr8i907yWsoUx+M3S+0SNjcHyu7qg6+aYvqF671TLXfTzU+2uaTnOOzbFc+7yHoZE59npIL175kay/ZxlKMH6a+NSJdl90XKXytpbMpTr/kP5zJfqxQDzneYWTstxh9pPPdYJ/CL8alTBag+fFvHFXtQMutWxBloOUMMHS6GWSyVYS4pvgmexXtVjc/TFWk9ZnnZLt3+caI10/8Xkb+hsYlfeh+QOyPNQN1S7hv2nqivEVSj/Ex+1lu73Ib1olbu4jpfN4ddbWbHN+/mcpWfUem+g7RhK4833SuepHbN0d5PjKF1kUll3xPFc5d+btTW9uqdCHXwaQ7kw252ENIW9vKTdEfTLox+VPYT6r8XXUWq7tYuXyZnEAG+ic+pwyVdRLDp8wcOp0kEZNXzLyqw3f+yEkjMI1sFznk8ulDKcoKlcFVlz75qPyu9+U8YuvnqnfXNDn6t6neNr3xfHj4JEU500ma8SSkjjodptBlTLurbI7rTxUnhcxF6d9W76KRbd6G3DdVNj2qia/qD3KY2O90elLJocpHJc90Q7kqVLqaLlGUjYj+Pg00jD8Xk+Wnf5UAN8c8HGrvXKYi+4irnsoo09ctU29Fll2UraSyaxnTOar8DFw+w60St+cRNlzfm9E9y9CNUTZM5/7iOTWR6imOgaKf/pn6hJw/f8dDdS6u0tNhDN1ZOlGUoauTrqyQNvCd21Mjy8N/T7AixBkQrm3tRKS0tngDwrWYzobuLFwXV3WfP5uR9TGTXdvc3BRVjq18l3rbwmaS8c9QByR4m3Sb/lPVX2V/M4naDkV79GFmJDad2NaLOdpBpxsbvs+/YubgVPO5bn3h+75BahnEOU/EVb+yTL7vQeTQp04GH/twfTYaCv9ehe8XXdZ0Ic+IY94Hcik/9h0Zk35c7MdWXo737HM/y6dllPENj9zeuvq7vMMYam88fZnfU7nOHznf6/AdP+W8ffXv2q6uelDlE1N/Wx+Prb/MG8ARBVJ0eb7rz5Tf6sl5l/G9nizDnJLJudZoaNqU/hbsCPH73dhu+03aWPiZhW9/yLHf8IGvT1OtzwZJ56yG/7YvX5sSdn+yof6x5av2ebxcV1dOZ9pDVgSXys/36uLzG1s5Nvj7pKo9axm2zsueylxeT1lWlQ4rkuuzx5f3+VXPPGIhgbLnKp/rtiJdcz2lOtMpAtMZV27E/kRttyaF83dFbf3NdYwXx6sZpH0uVkZ/VslmOrspa24V1+O56u3TdmXpQdaJy36wLPm4LZVR7jyp/CLOmULtzeWZoqstuLS9rhzTmqwIe3LVia0f2OSP3c/71Ec8V0itv6JtONbOXdb3Oc5YdcTaQVFzRWg7+z6HydnHy+qPoWO+j1yq8anofifWl7ri97chNiq/z6KyM37t8333sJR/SF/3bUvd+z+8nV3KNPWfIvt3mfNZijFAZT8xfXSekLfOtl3rHCuPzxrEdT7U9UvRjn3HKV5/XTuo2i3n+E3L5L+3yN+TkH+z07ZGDlkviuXLcX3aL7b+8m+duhCzJonp/yF9wabPItZhJmJ/N8pVfvn31Fok7PeiYsalFON4bPnyuOO7Ru2G+S52fqB5DAt55bJtXf2LtJdQParCVevHlqcufduvKJuQ5yxxvA/Zw6W0l5D3+nz7a4wdieXxd+FS2SjPN7Z9XXDRp62/dMv4GTM22uwx1/iTe7zTUSfjf1Mqld36EHv2xvPoprMnGfGvIiDHk+/x+EQTP7fMOjl928f0/855OTnaJ5XeQsevVHNojO5147ePXLH681mDqOBhqef/Ivp+7PMF1Vxs02kMITLK30zp/k+FbX1RdP/w1b2OMt9hiR1bKLHfZ+XWT+4+ahqzVM8iUug81r5tfTf3+JB6DPFpk1zllLUu9523cpPLdlR6zTVP+bShGFd1lh/Td33rVdT44WqTtjqktOtc87osc8x5hM9vyLrK49v+Pvmp7De0/vyvLJvk1C3+1OOyLyG/aSSud1L/TlLq/BoZ5M2xNj66IFRlT9fcT4GqDYosQ3df/G0zlR5U4UVzjAJZPpW8NlLI5lOejzwq+eS4rnWZbsjTx7ZUrq4sXdrQPmAa82Pb0HVuyZl3rrrZ7Nal/ULzdy0zBUXrMaQcU18v6ncmxd9eM/1fkdQ24Tvu+paZ2q5S6z13+anlTyVfrv4aWz/desfFfn3WEj727rNGKHJdlqsM1VompjzT+shXv7F75dj3J3K3qY7QM7DcZ2L/Aw==',
)
const classTrie = new UnicodeTrie(data)

const mapClass = function (c) {
  switch (c) {
    case AI:
      return AL

    case SA:
    case SG:
    case XX:
      return AL

    case CJ:
      return NS

    default:
      return c
  }
}

const mapFirst = function (c) {
  switch (c) {
    case LF:
    case NL:
      return BK

    case SP:
      return WJ

    default:
      return c
  }
}

class Break {
  constructor(position, required = false) {
    this.position = position
    this.required = required
  }
}

class LineBreaker {
  constructor(string) {
    this.string = string
    this.pos = 0
    this.lastPos = 0
    this.curClass = null
    this.nextClass = null
    this.LB8a = false
    this.LB21a = false
    this.LB30a = 0
  }

  nextCodePoint() {
    const code = this.string.charCodeAt(this.pos++)
    const next = this.string.charCodeAt(this.pos)

    // If a surrogate pair
    if (0xd800 <= code && code <= 0xdbff && 0xdc00 <= next && next <= 0xdfff) {
      this.pos++
      return (code - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000
    }

    return code
  }

  nextCharClass() {
    return mapClass(classTrie.get(this.nextCodePoint()))
  }

  getSimpleBreak() {
    // handle classes not handled by the pair table
    switch (this.nextClass) {
      case SP:
        return false

      case BK:
      case LF:
      case NL:
        this.curClass = BK
        return false

      case CR:
        this.curClass = CR
        return false
    }

    return null
  }

  getPairTableBreak(lastClass) {
    // if not handled already, use the pair table
    let shouldBreak = false
    switch (pairTable[this.curClass][this.nextClass]) {
      case DI_BRK: // Direct break
        shouldBreak = true
        break

      case IN_BRK: // possible indirect break
        shouldBreak = lastClass === SP
        break

      case CI_BRK:
        shouldBreak = lastClass === SP
        if (!shouldBreak) {
          shouldBreak = false
          return shouldBreak
        }
        break

      case CP_BRK: // prohibited for combining marks
        if (lastClass !== SP) {
          return shouldBreak
        }
        break

      case PR_BRK:
        break
    }

    if (this.LB8a) {
      shouldBreak = false
    }

    // Rule LB21a
    if (this.LB21a && (this.curClass === HY || this.curClass === BA)) {
      shouldBreak = false
      this.LB21a = false
    } else {
      this.LB21a = this.curClass === HL
    }

    // Rule LB30a
    if (this.curClass === RI) {
      this.LB30a++
      if (this.LB30a == 2 && this.nextClass === RI) {
        shouldBreak = true
        this.LB30a = 0
      }
    } else {
      this.LB30a = 0
    }

    this.curClass = this.nextClass

    return shouldBreak
  }

  nextBreak() {
    // get the first char if we're at the beginning of the string
    if (this.curClass == null) {
      let firstClass = this.nextCharClass()
      this.curClass = mapFirst(firstClass)
      this.nextClass = firstClass
      this.LB8a = firstClass === ZWJ
      this.LB30a = 0
    }

    while (this.pos < this.string.length) {
      this.lastPos = this.pos
      const lastClass = this.nextClass
      this.nextClass = this.nextCharClass()

      // explicit newline
      if (this.curClass === BK || (this.curClass === CR && this.nextClass !== LF)) {
        this.curClass = mapFirst(mapClass(this.nextClass))
        return new Break(this.lastPos, true)
      }

      let shouldBreak = this.getSimpleBreak()

      if (shouldBreak === null) {
        shouldBreak = this.getPairTableBreak(lastClass)
      }

      // Rule LB8a
      this.LB8a = this.nextClass === ZWJ

      if (shouldBreak) {
        return new Break(this.lastPos)
      }
    }

    if (this.lastPos < this.string.length) {
      this.lastPos = this.string.length
      return new Break(this.string.length)
    }

    return null
  }
}

module.exports = LineBreaker

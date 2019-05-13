export declare function getPixelRatio(context: any): number;
export declare const createTextFontString: (attrs: {
    italic?: boolean | undefined;
    bold?: boolean | undefined;
    size: number;
    font: string;
}) => string;
export declare const measureTextWidth: (text: string, attrs: {
    italic: boolean;
    bold: boolean;
    size: number;
    font: string;
}) => number;
export declare const convertPt2Px: number[];
export declare const measureTextMetrics: (attrs: {
    bold: boolean;
    size: number;
    font: string;
}) => {
    baseline: number;
    bottom: number;
    xTop: number;
};
export declare const requestIdleCallback: any;
export declare const cancelIdleCallback: any;

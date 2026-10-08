import * as React from "react";

declare module "react-icons" {
  export interface IconBaseProps extends React.SVGAttributes<SVGElement> {
    children?: React.ReactNode;
    size?: string | number;
    color?: string;
    title?: string;
    className?: string;
    style?: React.CSSProperties;
  }
  export type IconType = (props: IconBaseProps) => React.ReactElement | null;
}

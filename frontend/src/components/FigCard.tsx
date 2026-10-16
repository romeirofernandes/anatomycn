import type { ReactNode } from "react";

export function FigCard(props: {
  id: string;
  fig: string;
  title: string;
  hint: string;
  readout: string;
  legend: ReactNode;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="iso-figure" id={props.id} style={{ margin: "32px 0 36px" }}>
      <div className="iso-plate">
        <div className="iso-plate-corners" aria-hidden="true">
          <span className="iso-plate-corner" data-corner="fig">
            {props.fig}
          </span>
          <span className="iso-plate-corner" data-corner="title">
            {props.title}
          </span>
          <span className="iso-plate-corner" data-corner="hint">
            {props.hint}
          </span>
          <span
            className="iso-plate-corner"
            data-corner="readout"
            data-testid={`${props.id}-readout`}
          >
            {props.readout}
          </span>
        </div>
        {props.children}
      </div>
      <figcaption className="iso-legend mt-3 grid gap-2">
        <div>{props.legend}</div>
        <div>{props.caption}</div>
      </figcaption>
    </figure>
  );
}

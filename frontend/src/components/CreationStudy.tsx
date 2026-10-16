import { Plate } from "../iso/react/draw";
import { CreationLive } from "../figures/creation/live";

export function CreationStudy() {
  return (
    <Plate
      fig="Fig 1"
      title="Creation study · vellum on a light table"
      hint="drag across · arrow keys · 0–12 mm"
      readout="gap 1.2 mm · spark 99%"
      keys={[
        { mark: "raised", label: "the rig: table, gantry, lamp" },
        { mark: "lit", label: "the spark at the fingertip gap" },
        { mark: "dotted", label: "construction ink on vellum" },
        { mark: "dim", label: "steel rules and seams" },
      ]}
      caption="Two hands reach across a vellum sheet. The gap between the fingertips runs the whole figure: one number in millimetres sets the drawn hands, the gantry feelers that ride the gap, and the spark. It peaks just short of contact and dies past 8 mm. The rig measures the study at 3:1. Hands after the Sistine fresco (public domain), redrawn as construction linework."
    >
      <CreationLive />
    </Plate>
  );
}

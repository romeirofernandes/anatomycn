# Roadmap

Figures queued for the sheet, in the order they were asked for. Each one has to
earn its place the same way the first two did: a real object, drawn part by part
from the kit, driven by one number, and interesting to watch for longer than a
glance.

## Next: the padlock

A padlock that closes and locks. The shackle drops into the body, the plug
turns, the bolt throws across, and the latch clicks home. Built for the place a
page wants to say something is secure: a plan feature, an encrypted export, a
private room.

- The turning: the shackle rises on a hinge axis, so the moving parts can be
  rebuilt per frame the way the tonearm is, rather than turned by a screen
  matrix.
- The click: the plug rotation and the bolt stroke should be one gesture with a
  short overshoot at the end, not two separate moves.

## Then: the X-ray scanner

A conveyor belt with a scanner arch over it. An item rides in, the arch sweeps,
and the item comes out the far side better than it went in: a virus stripped
out, a scan processed, a thing cleaned up.

- Two states to draw for the same object, which is the interesting part: the
  drawing has to read as one thing changing rather than two things swapping.
- The belt is a flat run of parts, so it takes the turntable's lesson: parts
  that lie flat at one height can turn or slide under a matrix taken at that
  height.

## After that

- Escalator: steps that fold flat, a handrail that runs at a different speed.
- Safe dial: a combination being dialled, with the gates lining up behind the
  face.
- Loom: heddles lifting, a shuttle crossing, cloth appearing at the fell.
- Lighthouse: a lamp turning, a beam sweeping, a fresnel lens in section.
- Claw machine: a claw that closes on a prize and misses, on a loop.

## Rules that held for the first two

- Do not repeat what the skill already ships: the dial indicator, the desk
  computer, the arcade cabinet, the Raptor engine, the ripple tank, the test
  rig, the spot plate and the turning dial are taken.
- No figure may depend on Tailwind, beUI or any UI library. The kit and the
  figure are the whole dependency.
- One `requestAnimationFrame` loop per figure, refs only, no React render per
  frame, and no motion while the figure is off screen or the reader has asked
  for less motion.
- A figure that starts on its own keeps a visible pause control wherever it is
  embedded, cards included: motion that outlives five seconds has to be
  stoppable.
- Secondary text rides `--anatomy-muted` and has to clear 4.5:1 on the page, on
  a card and on the code surface, in both themes. The token moves, not the rule.

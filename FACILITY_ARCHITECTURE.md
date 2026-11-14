# Facility architecture

Chapter 1 is one continuous preparation center. The player starts in Reception, walks north into a central lobby, and reaches every department from that lobby. Suit Preparation continues east into the departure corridor. Nothing in this map launches the spacecraft.

The map is data in `src/content/world.ts` and drawing in `src/render/draw.ts`. Story progress does not depend on coordinates. It depends on object ids in `src/systems/mission.ts`.

## Coordinate system

The world origin is the top-left. X increases to the right. Y increases downward. Units are pixels. `WORLD` is 2800 by 1720 and is only the camera bound. Rooms do not have to fill it.

The player collision box is 28 by 18, centered on the feet. Walking speed is 230 pixels per second. A room interior of about 450 by 400 is enough for one interaction. The lobby is larger because it is the hub.

The camera follows the player. Zoom is `clamp(viewWidth / 1100, 0.75, 1.25)`. UI panels are HTML in screen space and do not move with the camera.

## Layout

```
                 MISSION BRIEFING
                        |
COMMUNICATIONS — CENTRAL LOBBY — SUIT PREPARATION — DEPARTURE
                        |
                    RECEPTION
```

| Room id | Label | Origin | Size | Role |
| --- | --- | --- | --- | --- |
| `reception` | RECEPTION | 694, 1204 | 760 × 480 | Entrance, Val Ortiz, spawn |
| `lobby` | CENTRAL LOBBY | 524, 484 | 1100 × 720 | Navigation hub |
| `briefing` | MISSION BRIEFING | 694, 24 | 760 × 460 | Dr. Chen, Dr. Patel, Moon display |
| `comms` | COMMUNICATIONS | 24, 564 | 500 × 560 | Leo Voss, radio pickup |
| `suit` | SUIT PREPARATION | 1624, 564 | 520 × 560 | Nia Brooks, suit station |
| `boarding` | DEPARTURE | 2144, 484 | 620 × 720 | Riley Morgan, hatch |

Rooms share edges. They do not overlap. The accent color marks the department: white for reception, cyan for the lobby and communications, pale gray for briefing, amber for the suit bay and departure.

## Doors and collision

`WALL` is 28. Each room's walkable interior is inset by that amount. A door is a 56-pixel bridge across the two insets, with a 176-pixel opening. `doors` is the source for both collision and drawing.

| Door id | Connects | Opening |
| --- | --- | --- |
| `to-briefing` | Lobby north to Briefing | horizontal |
| `to-reception` | Lobby south to Reception | horizontal |
| `to-comms` | Lobby west to Communications | vertical |
| `to-suit` | Lobby east to Suit Preparation | vertical |
| `to-departure` | Suit east to Departure | vertical |

`walkable()` is the room interiors plus those door rectangles. `blocked()` in `src/game.ts` rejects a move when any corner of the player box leaves that union, or when the box overlaps a prop with `blocks: true`. Actors do not block movement.

The east-west band through Suit Preparation, about y 756–932, is the route to Departure. Lockers and the suit platform stay north and south of that band. The scanner arch in Departure does not block, so a visual gate cannot trap the player.

## People

Positions are feet, in `actorDefs`. Interactive radius is the distance at which E works.

| Id | Where | Position | Interactive |
| --- | --- | --- | --- |
| `val` | Reception, in front of the desk | 860, 1520 | yes |
| `chen` | Briefing, left of the aisle | 960, 230 | yes |
| `patel` | Briefing, above the side console | 1260, 280 | yes |
| `leo` | Communications | 240, 860 | yes |
| `nia` | Suit bay, north of the through-route | 1920, 690 | yes |
| `riley` | Departure, west of the hatch | 2460, 844 | yes |
| `crew-a` | Reception seating | 1240, 1560 | no |
| `crew-b` | Lobby seating | 900, 1100 | no |

The player spawns at `PLAYER_SPAWN` (1074, 1560), facing the lobby. `INTRO_FOCUS` (1074, 844) is the lobby center used for the short opening camera move.

## Gameplay props

These ids are read by `Mission.resolve`. Do not rename them.

| Id | Kind | Blocks | What E does |
| --- | --- | --- | --- |
| `moon` | `moon` | yes | Inspect the south-pole display |
| `console-a` | `console` | yes | Check the communications console |
| `radio` | `bench` | yes | Collect the radio when the story allows |
| `storage` | `storage` | yes | Inspect prepared equipment |
| `suit` | `platform` | no | Start suit equipping when the story allows |
| `hatch` | `hatch` | no | Board after Riley is at the hatch |

`ax` and `ay` are the interaction point. The prompt is drawn above the prop, not at the anchor. Other props are furniture only. They have no prompt, so E ignores them.

Riley's walk is `RILEY_PATH`: (2480, 844), then (2500, 720), beside the hatch and off the boarding line. She does not use collision. After the final dialogue, `BOARD_TARGET` moves the player to (2640, 844) and Riley to (2708, 844).

## Drawing

`drawWorld` paints, in order:

1. Room shells, floors, labels, and the amber objective outline.
2. Door openings and the floor sign stored on each door.
3. Dashed guides from `guides`.
4. Room-specific details: reception mark and entrance, lobby floor emblem and hologram, communications mast, suit-bay glow, departure lights.
5. Props and actors, sorted by foot Y.

Character drawing is unchanged. New prop kinds are `seat`, `plant`, `board`, and `arch`. `board` has a moving scan line. The lobby hologram is drawn by `drawLobby`, not by a prop, so it stays on the room center.

Guides are visual only. They are not collision.

## How to add a room

1. Add a `rooms` entry with an id, label, rect, floor, and accent. Place it against an existing room so the shared edge is exact.
2. Add a `doors` entry whose rectangle covers the 56-pixel gap between the two interiors. Keep the opening at least 160 pixels so the player box fits. Set `sign` and `signAt` on the lobby side of the new door, or on the approach side if it does not open from the lobby.
3. Add `actorDefs` and `props` inside the interior, clear of the door mouth. Give gameplay objects a stable id and, if the player must use them, a prompt, radius, and anchor on open floor.
4. If the room is an objective destination, teach `focusFor` in `src/game.ts` to return the new room id. That only changes the amber outline.
5. Add a branch in `drawRoomDetails` for dressing that should stay attached to the room. Use the room rect, not old absolute coordinates.
6. Check that a walk from Reception reaches the new door and every new anchor. Props with `blocks: true` must not cross a door band.

## Animation integration

Doors, consoles, the suit platform, the scanner, and the hologram are separate draw functions keyed by id. A later animation pass can replace the body of `drawDoor`, `drawProp`, or `drawLobby` without moving the map.

Safe extension points:

- `doors[].id` for open, close, and indicator lights. Collision is the `doors` rectangle. A closed door should be removed from `doorways()` or represented by a blocking prop. Do not only change the drawing, or the player will walk through a shut door.
- `scanner` is kind `arch` and currently `blocks: false` on purpose. An animated security gate can start blocking only while it is closed.
- `suit` is kind `platform` and `blocks: false`. The equip sequence already locks the player in `Game.updateSuit`.
- `radio` uses kind `bench` so the existing glowing handset keeps drawing until `radioTaken` is true.
- `hatch` uses `paint.hatchOpen`, which becomes true when boarding starts.
- `board` props already read `paint.time` for a scan line. `text` is the label.
- The lobby hologram is the ellipse and disc in `drawLobby`. Replace that function to change the hologram without touching collision.

Character looks, names, and dialogue scripts are not part of the facility data. Leave `LOOKS` and `src/content/story.ts` alone when the change is only architectural.

"""
battery_terminal_cdc_powerlines_trunk_branch.py

Update:
- Multi-output A batteries draw ONE shared horizontal trunk.
- Branching happens farther right (controlled by MULTI_OUT_EXTRA).
- We no longer force every connection to be completely separate; the trunk is shared by design.
- Lines stay out of the containers/utility boxes.
- Transfer particles follow the same routed line (including the trunk).

Right side:
- 3 batteries: B1, B2, B3 (B3 charge=1 cap=2)
"""

import sys
import time
import math
import random
import pygame
from pygame import Rect

# ---------- Serial (Uno / Uno R4) ----------
SERIAL_ENABLED = True
SERIAL_PORT = "COM3"   # <-- change to your Arduino port
SERIAL_BAUD = 115200

try:
    import serial
except ImportError:
    serial = None
    SERIAL_ENABLED = False

# ---------- Visual style ----------
BG = (5, 10, 6)
FG = (80, 255, 140)
FG_DIM = (45, 140, 80)
BORDER = (60, 220, 120)
HILITE = (120, 255, 180)
WARN = (255, 180, 120)

LABEL_BG = (0, 0, 0, 170)
LABEL_BORDER = (60, 220, 120)
LABEL_TEXT = (160, 255, 200)

LINE_DIM = (45, 140, 80)
LINE_ON = (90, 255, 165)

SCREEN_W, SCREEN_H = 1280, 720
FPS = 60

SLOT_W, SLOT_H = 150, 76
SLOT_GAP = 40
SLOT_LABEL_Y_OFFSET = 22

FRAME_PAD = 44
HEADER_H = 160
FOOTER_H = 70

# ---------- Boot ----------
BOOT_MODE = True
boot_start_time = 0.0
boot_ready = False

boot_lines = [
    "Centers for Disease Control and Prevention (CDC)",
    "Office of Readiness and Response",
    "Incident Management System Terminal",
    "",
    "NOTICE: This system is for authorized use only.",
    "All activity is monitored and recorded in accordance with policy.",
    "",
    "Initializing power routing interface...",
    "Verifying cell containment matrix...",
    "Loading transfer protocols...",
    "Establishing device link: INPUT CONTROLLER ... OK",
    "Establishing device link: POWER BUS ........... OK",
    "",
    "System status: READY",
]
boot_char_speed = 60
boot_min_duration = 3.5

# ---------- POWER LINE CONFIG ----------
# Right side has 3 slots: B1=0, B2=1, B3=2
# A_TO_B = {
#     0: [0, 1],  # A1 -> B1,B2
#     1: [2],     # A2 -> B3
#     2: [],
#     3: [],
# }
A_TO_B = {
    0: [0, 2],  # A1 -> B1,B2
    1: [1],     # A2 -> B3
    2: [],
    3: [],
}

def build_b_to_a(a_to_b: dict, b_count: int):
    b_to_a = {}
    for a_idx, b_list in a_to_b.items():
        for b_idx in b_list:
            if b_idx < 0 or b_idx >= b_count:
                raise ValueError(f"Invalid B index {b_idx} in A_TO_B[{a_idx}]")
            if b_idx in b_to_a:
                raise ValueError(
                    f"B slot {b_idx} is connected to more than one A slot ({b_to_a[b_idx]} and {a_idx})"
                )
            b_to_a[b_idx] = a_idx
    return b_to_a

# ---------- Battery Model ----------
def make_battery(bid, charge, cap):
    charge = max(0, min(charge, cap))
    return {"id": bid, "charge": charge, "cap": cap}

left_slots = [
    make_battery(0, 6, 10),
    make_battery(1, 2, 6),
    make_battery(2, 9, 12),
    make_battery(3, 1, 4),
]
right_slots = [
    make_battery(4, 7, 8),
    make_battery(5, 0, 5),
    make_battery(6, 1, 2),  # B3
]

def slots_for(side):
    return left_slots if side == "left" else right_slots

def slot_count(side):
    return 4 if side == "left" else 3

# Validate connection map
try:
    B_TO_A = build_b_to_a(A_TO_B, b_count=3)
except ValueError as e:
    raise SystemExit(f"[POWER LINE CONFIG ERROR] {e}")

# ---------- Game State ----------
MODE_PICK_SOURCE = 0
MODE_PICK_TARGET = 1
MODE_ANIMATING = 2

mode = MODE_PICK_SOURCE
source_sel = None
cursor_side = "left"
cursor_idx = 0

valid_targets = []
target_side = None

transfer_anim = None
status_msg = "READY"
status_until = 0.0

flicker_until = 0.0
jitter_px = 0

# ---------- Layout ----------
def get_layout_rects():
    frame = Rect(FRAME_PAD, FRAME_PAD, SCREEN_W - 2 * FRAME_PAD, SCREEN_H - 2 * FRAME_PAD)
    header = Rect(frame.x, frame.y, frame.w, HEADER_H)
    footer = Rect(frame.x, frame.bottom - FOOTER_H, frame.w, FOOTER_H)
    main = Rect(frame.x, header.bottom, frame.w, frame.h - header.h - footer.h)
    return frame, header, main, footer

def column_centers(main_rect):
    left_x = main_rect.x + int(main_rect.w * 0.28)
    right_x = main_rect.x + int(main_rect.w * 0.72)
    return left_x, right_x

def slot_rect(side, idx, main_rect):
    left_x, right_x = column_centers(main_rect)
    x = left_x if side == "left" else right_x

    total = 4 if side == "left" else 3
    total_h = total * SLOT_H + (total - 1) * SLOT_GAP
    start_y = main_rect.y + (main_rect.h - total_h) // 2
    y = start_y + idx * (SLOT_H + SLOT_GAP)

    return Rect(int(x - SLOT_W / 2), int(y), SLOT_W, SLOT_H)

# ---------- Helpers ----------
def set_status(msg, seconds=1.2):
    global status_msg, status_until
    status_msg = msg
    status_until = time.time() + seconds

def trigger_flicker(seconds=0.2):
    global flicker_until
    flicker_until = max(flicker_until, time.time() + seconds)

def update_jitter():
    global jitter_px
    now = time.time()
    jitter_px = random.choice([0, 1, -1]) if now < flicker_until else 0

def draw_scanlines(surface, t):
    h = surface.get_height()
    w = surface.get_width()
    overlay = pygame.Surface((w, h), pygame.SRCALPHA)
    offset = int((t * 60) % 4)
    for y in range(offset, h, 4):
        pygame.draw.line(overlay, (0, 0, 0, 22), (0, y), (w, y))
    surface.blit(overlay, (0, 0))

def get_battery_at(side, idx):
    return slots_for(side)[idx]

def compute_transfer(source, target):
    space = target["cap"] - target["charge"]
    return min(source["charge"], max(0, space))

# ---------- Connection rules ----------
def connected_targets_for_source(side, idx):
    if side == "left":
        return "right", list(A_TO_B.get(idx, []))
    else:
        if idx in B_TO_A:
            return "left", [B_TO_A[idx]]
        return "left", []

def is_connected_pair(a_idx, b_idx):
    return b_idx in A_TO_B.get(a_idx, [])

# ---------- Stable connection list ----------
CONNECTIONS = []
for a_idx in sorted(A_TO_B.keys()):
    for b_idx in sorted(A_TO_B[a_idx]):
        CONNECTIONS.append((a_idx, b_idx))
PAIR_LANE = {pair: i for i, pair in enumerate(CONNECTIONS)}

# ---------- Routing knobs ----------
EDGE_INSET = 6
CORRIDOR_PAD_FROM_BOX = 60

TRACK_SPACING = 18
LANE_MARGIN_TOP = 28
LANE_MARGIN_BOTTOM = 28

# Trunk behavior
TRUNK_BASE_PUSH = 24
TRUNK_SPACING_BY_A = 26
MULTI_OUT_EXTRA = 70   # <-- increase this if you want A1 trunk even longer before branching

# Port offsets (only applied for branches, not the trunk)
PORT_OFFSET_STEP = 14
A_CONN_ORDER = {a: list(sorted(bs)) for a, bs in A_TO_B.items()}

def port_offset_for_A(a_idx, b_idx):
    bs = A_CONN_ORDER.get(a_idx, [])
    if b_idx not in bs:
        return 0
    k = bs.index(b_idx)
    center = (len(bs) - 1) / 2.0
    return int((k - center) * PORT_OFFSET_STEP)

def corridor_bounds(main_rect):
    a0 = slot_rect("left", 0, main_rect)
    b0 = slot_rect("right", 0, main_rect)

    left_edge = a0.right + CORRIDOR_PAD_FROM_BOX
    right_edge = b0.left - CORRIDOR_PAD_FROM_BOX

    if right_edge <= left_edge + 120:
        mid = (a0.right + b0.left) // 2
        left_edge = mid - 60
        right_edge = mid + 60

    return int(left_edge), int(right_edge)

def lane_y(main_rect, lane_idx, lane_count):
    top = main_rect.y + LANE_MARGIN_TOP
    bot = main_rect.bottom - LANE_MARGIN_BOTTOM
    available = max(1, bot - top)
    if lane_count <= 1:
        return (top + bot) // 2
    step = available // (lane_count - 1)
    return int(top + lane_idx * step)

def b_track_x_positions(main_rect):
    _, right_edge = corridor_bounds(main_rect)
    n = max(1, len(CONNECTIONS))
    center = (n - 1) / 2.0
    b_tracks = {}
    for (a_idx, b_idx), lane in PAIR_LANE.items():
        offset = int((lane - center) * TRACK_SPACING)
        b_tracks[(a_idx, b_idx)] = right_edge + offset
    return b_tracks

def trunk_x_for_A(a_idx, main_rect):
    left_edge, _ = corridor_bounds(main_rect)
    x = left_edge + TRUNK_BASE_PUSH + a_idx * TRUNK_SPACING_BY_A
    if len(A_TO_B.get(a_idx, [])) >= 2:
        x += MULTI_OUT_EXTRA
    return int(x)

def trunk_start_point_for_A(a_idx, main_rect):
    a_r = slot_rect("left", a_idx, main_rect)
    # TRUNK uses the center port (shared wire)
    return (a_r.right - EDGE_INSET, a_r.centery)

def route_full_points_a_to_b(a_idx, b_idx, main_rect):
    """
    Full path used for TRANSFER PARTICLES and general usage.
    If A has multiple outputs, path includes the shared trunk segment.
    """
    a_r = slot_rect("left", a_idx, main_rect)
    b_r = slot_rect("right", b_idx, main_rect)

    trunk_x = trunk_x_for_A(a_idx, main_rect)
    trunk_start = trunk_start_point_for_A(a_idx, main_rect)
    trunk_joint = (trunk_x, trunk_start[1])

    # Branch ports: apply small offsets ONLY after trunk to keep branches distinct
    branch_y0 = trunk_start[1] + port_offset_for_A(a_idx, b_idx)
    # keep branch point within container vertical area-ish (so it looks sane)
    branch_y0 = max(a_r.y + 12, min(branch_y0, a_r.bottom - 12))

    # lane and B routing
    y = lane_y(main_rect, PAIR_LANE[(a_idx, b_idx)], max(1, len(CONNECTIONS)))
    b_tracks = b_track_x_positions(main_rect)
    bx = b_tracks[(a_idx, b_idx)]

    end = (b_r.left + EDGE_INSET, b_r.centery)  # B port at center (clean)
    end_y = end[1]

    if len(A_TO_B.get(a_idx, [])) >= 2:
        # Shared trunk, then branch
        return [
            trunk_start,
            trunk_joint,
            (trunk_x, branch_y0),
            (trunk_x, y),
            (bx, y),
            (bx, end_y),
            end,
        ]
    else:
        # Single-output A: can drop/route closer to battery (no long trunk requirement)
        start = (a_r.right - EDGE_INSET, a_r.centery)
        return [
            start,
            (trunk_x, start[1]),
            (trunk_x, y),
            (bx, y),
            (bx, end_y),
            end,
        ]

def route_branch_only_points_a_to_b(a_idx, b_idx, main_rect):
    """
    Branch-only path used for DRAWING when trunk is drawn separately.
    Starts at the trunk joint.
    """
    a_r = slot_rect("left", a_idx, main_rect)
    b_r = slot_rect("right", b_idx, main_rect)

    trunk_x = trunk_x_for_A(a_idx, main_rect)
    trunk_y = trunk_start_point_for_A(a_idx, main_rect)[1]
    trunk_joint = (trunk_x, trunk_y)

    branch_y0 = trunk_y + port_offset_for_A(a_idx, b_idx)
    branch_y0 = max(a_r.y + 12, min(branch_y0, a_r.bottom - 12))

    y = lane_y(main_rect, PAIR_LANE[(a_idx, b_idx)], max(1, len(CONNECTIONS)))
    b_tracks = b_track_x_positions(main_rect)
    bx = b_tracks[(a_idx, b_idx)]

    end = (b_r.left + EDGE_INSET, b_r.centery)
    end_y = end[1]

    if len(A_TO_B.get(a_idx, [])) >= 2:
        return [
            trunk_joint,
            (trunk_x, branch_y0),
            (trunk_x, y),
            (bx, y),
            (bx, end_y),
            end,
        ]
    else:
        # no separate trunk to draw; drawing will just use full
        return route_full_points_a_to_b(a_idx, b_idx, main_rect)

def connection_polyline_for_transfer(frm_side, frm_idx, to_side, to_idx, main_rect):
    # Normalize to (A,B)
    if frm_side == "left":
        a_idx, b_idx = frm_idx, to_idx
        forward = True
    else:
        a_idx, b_idx = to_idx, frm_idx
        forward = False
    pts = route_full_points_a_to_b(a_idx, b_idx, main_rect)
    return pts if forward else list(reversed(pts))

# ---------- Polyline math ----------
def polyline_length(points):
    total = 0.0
    for i in range(len(points) - 1):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]
        total += math.hypot(x2 - x1, y2 - y1)
    return total

def point_on_polyline(points, dist):
    if not points:
        return (0, 0)
    if dist <= 0:
        return points[0]
    remaining = dist
    for i in range(len(points) - 1):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]
        seg_len = math.hypot(x2 - x1, y2 - y1)
        if seg_len <= 1e-6:
            continue
        if remaining <= seg_len:
            t = remaining / seg_len
            return (x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)
        remaining -= seg_len
    return points[-1]

def smoothstep(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)

# ---------- Transfer animation ----------
def start_transfer_animation(frm, to, moved, duration=0.85):
    global transfer_anim, mode
    s_side, s_idx = frm
    source = get_battery_at(s_side, s_idx)
    src_charge_now = max(0, source["charge"])
    transfer_anim = {
        "from": frm,
        "to": to,
        "moved": moved,
        "start": time.time(),
        "dur": duration,
        "src_charge_at_start": src_charge_now,
    }
    mode = MODE_ANIMATING
    set_status("TRANSFERRING...", duration)
    trigger_flicker(0.25)

def finish_transfer_if_done():
    global mode, source_sel, transfer_anim, valid_targets, target_side
    if mode != MODE_ANIMATING or not transfer_anim:
        return
    if time.time() - transfer_anim["start"] < transfer_anim["dur"]:
        return

    s_side, s_idx = transfer_anim["from"]
    t_side, t_idx = transfer_anim["to"]
    moved = transfer_anim["moved"]

    source = get_battery_at(s_side, s_idx)
    target = get_battery_at(t_side, t_idx)

    moved = min(moved, source["charge"])
    moved = min(moved, max(0, target["cap"] - target["charge"]))

    target["charge"] += moved
    source["charge"] -= moved

    set_status(f"TRANSFER COMPLETE: {moved} UNITS", 1.3)

    mode = MODE_PICK_SOURCE
    source_sel = None
    transfer_anim = None
    valid_targets = []
    target_side = None

# ---------- Input ----------
def handle_action(action):
    global BOOT_MODE, boot_ready
    global mode, source_sel, cursor_side, cursor_idx, valid_targets, target_side

    action = action.upper()

    if BOOT_MODE:
        if action == "A":
            BOOT_MODE = False
            trigger_flicker(0.25)
            set_status("INTERFACE LOADED", 1.0)
        return

    if mode == MODE_ANIMATING:
        return

    if mode == MODE_PICK_SOURCE:
        if action == "UP":
            cursor_idx = (cursor_idx - 1) % slot_count(cursor_side)
        elif action == "DOWN":
            cursor_idx = (cursor_idx + 1) % slot_count(cursor_side)
        elif action == "LEFT":
            cursor_side = "left"
            cursor_idx = min(cursor_idx, 3)
        elif action == "RIGHT":
            cursor_side = "right"
            cursor_idx = min(cursor_idx, 2)
        elif action == "A":
            batt = get_battery_at(cursor_side, cursor_idx)
            if batt["charge"] <= 0:
                set_status("SOURCE HAS NO CHARGE", 1.2)
                trigger_flicker(0.12)
                return

            ts, targets = connected_targets_for_source(cursor_side, cursor_idx)
            if not targets:
                set_status("NO POWER LINE CONNECTIONS", 1.2)
                trigger_flicker(0.12)
                return

            source_sel = (cursor_side, cursor_idx)
            target_side = ts
            valid_targets = targets

            cursor_side = target_side
            cursor_idx = valid_targets[0]

            mode = MODE_PICK_TARGET
            set_status("SELECT CONNECTED TARGET", 1.0)

    elif mode == MODE_PICK_TARGET:
        if action in ("UP", "DOWN"):
            if not valid_targets:
                return
            pos = valid_targets.index(cursor_idx) if cursor_idx in valid_targets else 0
            pos = (pos - 1) % len(valid_targets) if action == "UP" else (pos + 1) % len(valid_targets)
            cursor_idx = valid_targets[pos]

        elif action in ("LEFT", "RIGHT"):
            cursor_side = target_side

        elif action == "A":
            s_side, s_idx = source_sel
            t_side, t_idx = cursor_side, cursor_idx

            if t_side != target_side or t_idx not in valid_targets:
                set_status("INVALID TARGET", 1.0)
                trigger_flicker(0.12)
                return

            # normalize to A,B indices for connectivity check
            if s_side == "left":
                a_idx, b_idx = s_idx, t_idx
            else:
                a_idx, b_idx = t_idx, s_idx

            if not is_connected_pair(a_idx, b_idx):
                set_status("NO POWER LINE BETWEEN CELLS", 1.2)
                trigger_flicker(0.12)
                return

            source = get_battery_at(s_side, s_idx)
            target = get_battery_at(t_side, t_idx)

            moved = compute_transfer(source, target)
            if moved <= 0:
                set_status("TARGET AT CAPACITY", 1.2)
                trigger_flicker(0.12)
                return

            start_transfer_animation(source_sel, (t_side, t_idx), moved)

        elif action == "B":
            mode = MODE_PICK_SOURCE
            source_sel = None
            valid_targets = []
            target_side = None
            set_status("SELECT SOURCE", 0.9)

# ---------- Serial ----------
def open_serial():
    if not SERIAL_ENABLED or not serial:
        return None
    try:
        s = serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=0)
        time.sleep(0.2)
        return s
    except Exception:
        return None

def read_serial_lines(ser):
    if not ser:
        return []
    lines = []
    try:
        while True:
            line = ser.readline()
            if not line:
                break
            txt = line.decode("utf-8", errors="ignore").strip()
            if txt:
                lines.append(txt)
    except Exception:
        pass
    return lines

# ---------- Drawing ----------
def draw_text(surface, font, text, color, center=None, topleft=None):
    surf = font.render(text, True, color)
    r = surf.get_rect()
    if center is not None:
        r.center = center
    if topleft is not None:
        r.topleft = topleft
    surface.blit(surf, r)

def draw_label(surface, font, text, topleft):
    txt = font.render(text, True, LABEL_TEXT)
    tr = txt.get_rect(topleft=topleft)
    pad_x, pad_y = 8, 4
    bg = Rect(tr.x - pad_x, tr.y - pad_y, tr.w + pad_x * 2, tr.h + pad_y * 2)

    plate = pygame.Surface((bg.w, bg.h), pygame.SRCALPHA)
    pygame.draw.rect(plate, LABEL_BG, Rect(0, 0, bg.w, bg.h), border_radius=8)
    pygame.draw.rect(plate, (*LABEL_BORDER, 180), Rect(0, 0, bg.w, bg.h), 1, border_radius=8)

    surface.blit(plate, (bg.x, bg.y))
    surface.blit(txt, tr)

def draw_battery(surface, rect, batt):
    pygame.draw.rect(surface, FG, rect.inflate(-18, -18), 2, border_radius=10)
    inner = rect.inflate(-34, -34)
    cap = max(1, batt["cap"])
    charge = max(0, min(batt["charge"], cap))
    segments = min(12, cap)
    filled = int(round((charge / cap) * segments))
    seg_w = max(6, (inner.w - 10) // segments)
    for i in range(segments):
        r = Rect(inner.x + 5 + i * seg_w, inner.y + 4, seg_w - 2, inner.h - 8)
        pygame.draw.rect(surface, FG, r, 0 if i < filled else 1, border_radius=2)

def draw_polyline(surface, pts, color, width):
    for i in range(len(pts) - 1):
        pygame.draw.line(surface, color, pts[i], pts[i + 1], width)

def draw_power_lines(surface, main_rect, t_now):
    # Active highlight set
    active_pairs = set()
    if source_sel is not None and mode in (MODE_PICK_TARGET, MODE_ANIMATING):
        s_side, s_idx = source_sel
        if s_side == "left":
            for b in A_TO_B.get(s_idx, []):
                active_pairs.add((s_idx, b))
        else:
            a = B_TO_A.get(s_idx, None)
            if a is not None:
                active_pairs.add((a, s_idx))

    pulse = 0.5 + 0.5 * math.sin(t_now * 10.0)

    # 1) Draw trunks ONCE for multi-output A
    for a_idx, bs in A_TO_B.items():
        if len(bs) >= 2:
            start = trunk_start_point_for_A(a_idx, main_rect)
            trunk_x = trunk_x_for_A(a_idx, main_rect)
            trunk_joint = (trunk_x, start[1])

            any_active = any((a_idx, b) in active_pairs for b in bs)
            color = LINE_ON if any_active else LINE_DIM
            width = 3 if any_active else 2
            if any_active and pulse > 0.6:
                width += 1

            draw_polyline(surface, [start, trunk_joint], color, width)
            pygame.draw.circle(surface, color, start, 3)
            pygame.draw.circle(surface, color, trunk_joint, 3)

    # 2) Draw each connection; if it has a trunk, draw only the branch part
    for (a_idx, b_idx) in CONNECTIONS:
        has_trunk = len(A_TO_B.get(a_idx, [])) >= 2
        pts = route_branch_only_points_a_to_b(a_idx, b_idx, main_rect) if has_trunk else route_full_points_a_to_b(a_idx, b_idx, main_rect)

        is_active = (a_idx, b_idx) in active_pairs
        color = LINE_ON if is_active else LINE_DIM
        width = 2 if not is_active else 3 + (1 if pulse > 0.6 else 0)

        draw_polyline(surface, pts, color, width)
        pygame.draw.circle(surface, color, pts[-1], 3)

def draw_transfer_particles(surface, main_rect, t_now):
    if not transfer_anim:
        return

    frm_side, frm_idx = transfer_anim["from"]
    to_side, to_idx = transfer_anim["to"]
    start_t = transfer_anim["start"]
    dur = transfer_anim["dur"]
    src_charge_at_start = max(0, transfer_anim.get("src_charge_at_start", transfer_anim["moved"]))
    moved = transfer_anim["moved"]

    p = (t_now - start_t) / dur
    p = max(0.0, min(1.0, p))

    points = connection_polyline_for_transfer(frm_side, frm_idx, to_side, to_idx, main_rect)
    path_len = polyline_length(points)
    if path_len <= 1e-6:
        return

    dots = max(10, min(26, src_charge_at_start * 2))
    spread = 0.55
    target_filled_early = (moved < src_charge_at_start)

    for i in range(dots):
        delay = (i / max(1, dots - 1)) * spread
        u = (p - delay) / (1 - spread)
        if u <= 0:
            continue
        u = smoothstep(min(1.0, u))
        dist = u * path_len
        if target_filled_early and p >= 0.88:
            dist = min(dist, path_len)
        x, y = point_on_polyline(points, dist)
        t_tail = i / max(1, dots - 1)
        radius = max(2, int(6 - 3 * t_tail))
        pygame.draw.circle(surface, HILITE, (int(x), int(y)), radius)

def render_boot(surface, font_big, font_small):
    global boot_ready
    surface.fill((0, 0, 0))
    elapsed = time.time() - boot_start_time
    total_chars = int(elapsed * boot_char_speed)

    x, y = FRAME_PAD + 40, FRAME_PAD + 70
    line_gap = 32
    chars_used = 0
    for i, line in enumerate(boot_lines):
        if chars_used >= total_chars:
            break
        visible = line[: max(0, total_chars - chars_used)]
        f = font_big if i == 0 else font_small
        surface.blit(f.render(visible, True, FG), (x, y))
        chars_used += len(line) + 1
        y += line_gap

    all_chars = sum(len(s) + 1 for s in boot_lines)
    boot_ready = (elapsed >= boot_min_duration) and (total_chars >= all_chars)

    if int(time.time() * 2) % 2 == 0:
        surface.blit(font_small.render("Press CONFIRM to skip", True, FG_DIM), (x, y + 14))

def render_battery_screen(surface, fonts, t_now, t_elapsed):
    title_font, ui_font, small_font = fonts
    frame, header, main, footer = get_layout_rects()

    surface.fill(BG)
    pygame.draw.rect(surface, BORDER, frame, 2, border_radius=18)

    draw_text(surface, title_font, "CDC POWER ROUTING // POWER LINE TRANSFER", FG,
              topleft=(frame.x + 26, frame.y + 18))

    draw_power_lines(surface, main, t_now)

    for i in range(4):
        r = slot_rect("left", i, main)
        draw_text(surface, small_font, f"A{i+1}", FG_DIM, center=(r.centerx, r.y - SLOT_LABEL_Y_OFFSET))
        pygame.draw.rect(surface, BORDER, r, 2, border_radius=12)
        draw_battery(surface, r, left_slots[i])
        draw_label(surface, small_font, f"{left_slots[i]['charge']}/{left_slots[i]['cap']}",
                   (r.x + 10, r.y + r.h - 28))

    for i in range(3):
        r = slot_rect("right", i, main)
        draw_text(surface, small_font, f"B{i+1}", FG_DIM, center=(r.centerx, r.y - SLOT_LABEL_Y_OFFSET))
        pygame.draw.rect(surface, BORDER, r, 2, border_radius=12)
        draw_battery(surface, r, right_slots[i])
        draw_label(surface, small_font, f"{right_slots[i]['charge']}/{right_slots[i]['cap']}",
                   (r.x + 10, r.y + r.h - 28))

    if source_sel is not None:
        ss, si = source_sel
        sr = slot_rect(ss, si, main)
        pygame.draw.rect(surface, WARN, sr.inflate(12, 12), 2, border_radius=14)
        draw_text(surface, small_font, "SOURCE", WARN, topleft=(sr.x + 10, sr.y - 18))

    if mode != MODE_ANIMATING:
        cr = slot_rect(cursor_side, cursor_idx, main)
        pulse = 0.5 + 0.5 * math.sin(t_elapsed * 6.0)
        infl = 10 + int(pulse * 6)
        pygame.draw.rect(surface, HILITE, cr.inflate(infl, infl), 2, border_radius=14)

    draw_transfer_particles(surface, main, t_now)

    if time.time() < status_until:
        draw_text(surface, small_font, status_msg, FG_DIM, center=(frame.centerx, footer.y + 24))

    draw_scanlines(surface, t_elapsed)

# ---------- Main ----------
def main():
    global boot_start_time, SCREEN_W, SCREEN_H

    pygame.init()
    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H), pygame.RESIZABLE)
    pygame.display.set_caption("CDC Power Routing Terminal")
    clock = pygame.time.Clock()

    base = pygame.Surface((SCREEN_W, SCREEN_H))
    title_font = pygame.font.SysFont("consolas", 28, bold=True)
    ui_font = pygame.font.SysFont("consolas", 22)
    small_font = pygame.font.SysFont("consolas", 18)
    fonts = (title_font, ui_font, small_font)

    boot_start_time = time.time()
    start = time.time()

    ser = open_serial()
    set_status("SERIAL CONNECTED" if ser else "SERIAL OFFLINE (KEYBOARD OK)", 1.6)

    while True:
        t_elapsed = time.time() - start
        t_now = time.time()

        update_jitter()
        finish_transfer_if_done()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                try:
                    if ser:
                        ser.close()
                except Exception:
                    pass
                sys.exit(0)

            if event.type == pygame.VIDEORESIZE:
                SCREEN_W, SCREEN_H = event.w, event.h
                screen = pygame.display.set_mode((SCREEN_W, SCREEN_H), pygame.RESIZABLE)
                base = pygame.Surface((SCREEN_W, SCREEN_H))

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.event.post(pygame.event.Event(pygame.QUIT))
                elif event.key == pygame.K_UP:
                    handle_action("UP")
                elif event.key == pygame.K_DOWN:
                    handle_action("DOWN")
                elif event.key == pygame.K_LEFT:
                    handle_action("LEFT")
                elif event.key == pygame.K_RIGHT:
                    handle_action("RIGHT")
                elif event.key in (pygame.K_RETURN, pygame.K_SPACE):
                    handle_action("A")
                elif event.key in (pygame.K_BACKSPACE, pygame.K_DELETE):
                    handle_action("B")

        for line in read_serial_lines(ser):
            handle_action(line)

        if BOOT_MODE:
            render_boot(base, title_font, ui_font)
        else:
            render_battery_screen(base, fonts, t_now, t_elapsed)

        screen.fill((0, 0, 0))
        screen.blit(base, (jitter_px, jitter_px))
        pygame.display.flip()
        clock.tick(FPS)

if __name__ == "__main__":
    main()

"""Build exerciseCatalog.json for the FitPower Workout Gallery.

Run from this folder:
  curl -sSL -o ex.json https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
  python3 build.py        # writes exerciseCatalog.json -> copy to src/content/

Source: yuhonas/free-exercise-db (Unlicense / public domain) filtered to dumbbell + bands,
plus hand-added DB/band/bodyweight moves that the DB is missing (incl. every move in the
program + ALT substitutions). Scores = composite 0-10 judgement from cited sources.
"""
import json, re
from instr import INSTR

DB = {x['id']: x for x in json.load(open('ex.json'))}
IMG_BASE = 'exercises'  # bundled under public/exercises/<imageId>/0.jpg

ALBUMS = [
    ('arms', 'Arms', [('biceps', 'Biceps'), ('triceps', 'Triceps'), ('forearms', 'Forearms & grip')]),
    ('shoulders', 'Shoulders', [('front-delts', 'Front delts & overhead press'), ('side-delts', 'Side delts'),
                                ('rear-delts', 'Rear delts'), ('rotator-cuff', 'Rotator cuff'), ('traps', 'Traps')]),
    ('chest', 'Chest', [('press', 'Flat & floor press'), ('incline', 'Upper chest (incline)'),
                        ('fly', 'Flyes'), ('push-up', 'Push-ups')]),
    ('back', 'Back', [('lats', 'Lats (width)'), ('mid-back', 'Mid back (rows)'), ('lower-back', 'Lower back')]),
    ('core', 'Core', [('abs', 'Abs'), ('obliques', 'Obliques'), ('stability', 'Anti-rotation & stability')]),
    ('legs', 'Legs', [('quads', 'Quads'), ('hamstrings', 'Hamstrings & hinge'), ('glutes', 'Glutes'),
                      ('calves', 'Calves'), ('hips', 'Hip abductors & adductors')]),
    ('full-body', 'Full body', [('compound', 'Compound strength'), ('conditioning', 'Conditioning & power')]),
]

SOURCES = {
    'nippard-biceps': ('Jeff Nippard biceps exercise ranking (via Fitness Volt)', 'https://fitnessvolt.com/jeff-nippard-ranks-best-and-worst-bicep-exercises/'),
    'ace-biceps': ('ACE study: best biceps exercises (EMG)', 'https://www.acefitness.org/education-and-resources/professional/prosource/research-special-issue-2015/5319/ace-study-reveals-best-biceps-exercises'),
    'nippard-triceps': ('Jeff Nippard triceps exercise ranking (via BarBend)', 'https://barbend.com/news/jeff-nippard-ranks-best-and-worst-triceps-exercises/'),
    'nippard-shoulders': ('Jeff Nippard shoulder exercise ranking (via Fitness Volt)', 'https://fitnessvolt.com/jeff-nippard-ranks-best-worst-shoulder-exercises/'),
    'ace-shoulders': ('ACE study: top shoulder exercises (EMG)', 'https://www.acefitness.org/education-and-resources/professional/prosource/research-special-issue-2015/5320/dynamite-delts-ace-research-identifies-top-shoulder-exercises/'),
    'nippard-chest': ('Jeff Nippard chest exercise ranking (via Fitness Volt)', 'https://fitnessvolt.com/jeff-nippard-best-and-worst-chest-exercises'),
    'nippard-back': ('Jeff Nippard back exercise ranking (via Fitness Volt)', 'https://fitnessvolt.com/jeff-nippard-best-and-worst-back-exercises'),
    'nippard-quads': ('Jeff Nippard quad exercise ranking (via Fitness Volt)', 'https://fitnessvolt.com/jeff-nippard-ranks-best-worse-quad-exercises'),
    'nippard-glutes': ('Jeff Nippard glute exercise ranking (via Fitness Volt)', 'https://fitnessvolt.com/jeff-nippard-rates-glute-exercises/'),
    'ace-abs': ('ACE study: most effective ab exercises (EMG)', 'https://www.acefitness.org/resources/everyone/blog/3540/top-ab-exercises/'),
    'consensus': ('General strength-coaching consensus (ExRx, NSCA basics)', 'https://exrx.net/Lists/Directory'),
}

# --------------------------------------------------------------------------------------
# DB entries: id -> (album, sub, score, reason, opts)
# opts: knee ('friendly'|'caution'|'avoid'), bench (bool), diff override, src list, aliases
# --------------------------------------------------------------------------------------
B, T, F = 'biceps', 'triceps', 'forearms'
NB, NT, NS, AB, AS = ['nippard-biceps'], ['nippard-triceps'], ['nippard-shoulders'], ['ace-biceps'], ['ace-shoulders']
NC, NBK, NQ, NG, C = ['nippard-chest'], ['nippard-back'], ['nippard-quads'], ['nippard-glutes'], ['consensus']

E = {
 # ---------------- ARMS / BICEPS
 'Dumbbell_Bicep_Curl': ('arms', B, 8.0, 'A-tier staple: simple, easy to progress, trains both arms.', dict(src=NB, aliases=['DB biceps curl'])),
 'Dumbbell_Alternate_Bicep_Curl': ('arms', B, 8.0, 'Same as the standard DB curl (A-tier); alternating lets you focus on each rep.', dict(src=NB)),
 'Seated_Dumbbell_Curl': ('arms', B, 7.5, 'Removes body swing; slightly less load than standing.', dict(src=NB)),
 'Hammer_Curls': ('arms', B, 8.0, 'A-tier: hits the brachialis + forearm (brachioradialis) for thicker arms.', dict(src=NB, aliases=['Hammer curl'])),
 'Alternate_Hammer_Curl': ('arms', B, 7.5, 'Alternating hammer curl; same brachialis/forearm benefit.', dict(src=NB)),
 'Cross_Body_Hammer_Curl': ('arms', B, 7.5, 'Hammer variation that biases brachialis; joint-friendly.', dict(src=C)),
 'Concentration_Curls': ('arms', B, 8.5, 'Highest biceps EMG in the ACE study; strict isolation.', dict(src=AB)),
 'Standing_Concentration_Curl': ('arms', B, 7.5, 'Concentration curl bent over; strict but harder to brace.', dict(src=AB)),
 'Incline_Dumbbell_Curl': ('arms', B, 8.5, 'A-tier: loads the biceps in the stretched position (good for growth).', dict(src=NB, bench=True)),
 'Alternate_Incline_Dumbbell_Curl': ('arms', B, 8.5, 'Incline curl, alternating; great stretch on the long head.', dict(src=NB, bench=True)),
 'Incline_Hammer_Curls': ('arms', B, 8.0, 'Stretch-biased hammer curl.', dict(src=NB, bench=True)),
 'Incline_Inner_Biceps_Curl': ('arms', B, 7.5, 'Incline curl with outward rotation; stretch-biased.', dict(src=NB, bench=True)),
 'Flexor_Incline_Dumbbell_Curls': ('arms', B, 6.5, 'Niche wrist-flexed incline curl; limited load.', dict(src=C, bench=True)),
 'Lying_Supine_Dumbbell_Curl': ('arms', B, 8.0, 'A-tier lying curl: huge stretch; skip if shoulders feel irritated.', dict(src=NB, bench=True)),
 'One_Arm_Dumbbell_Preacher_Curl': ('arms', B, 9.0, 'S-tier: angled arm keeps tension on the biceps.', dict(src=NB, bench=True)),
 'Two-Arm_Dumbbell_Preacher_Curl': ('arms', B, 8.5, 'Preacher curl both arms; S-tier pattern, slightly less control.', dict(src=NB, bench=True)),
 'Preacher_Hammer_Dumbbell_Curl': ('arms', B, 9.0, 'S-tier: hammer curl with a better resistance profile.', dict(src=NB, bench=True)),
 'Dumbbell_Prone_Incline_Curl': ('arms', B, 6.0, 'Spider-curl style: C-tier, short-position bias.', dict(src=NB, bench=True)),
 'Standing_One-Arm_Dumbbell_Curl_Over_Incline_Bench': ('arms', B, 8.0, 'Preacher-like curl using a bench back.', dict(src=NB, bench=True)),
 'Seated_Dumbbell_Inner_Biceps_Curl': ('arms', B, 7.0, 'Outward-rotated curl; stresses the short head.', dict(src=C)),
 'Standing_Inner-Biceps_Curl': ('arms', B, 7.0, 'Outward-rotated standing curl.', dict(src=C)),
 'Standing_Dumbbell_Reverse_Curl': ('arms', B, 7.0, 'Overhand curl: brachioradialis + forearm extensors.', dict(src=C, aliases=['Reverse curl'])),
 'Zottman_Curl': ('arms', B, 8.0, 'A-tier style: curls up supinated, lowers pronated, so you train biceps and forearms in one move.', dict(src=NB)),
 'Zottman_Preacher_Curl': ('arms', B, 7.5, 'Zottman on a preacher; strict, forearm-heavy.', dict(src=NB, bench=True)),
 # ---------------- ARMS / TRICEPS
 'Standing_Dumbbell_Triceps_Extension': ('arms', T, 8.5, 'Overhead = long-head stretch; overhead work beat pressdowns for growth in studies.', dict(src=NT, aliases=['DB overhead triceps ext.'])),
 'Standing_One-Arm_Dumbbell_Triceps_Extension': ('arms', T, 8.5, 'A-tier: one-arm overhead extension; finds left/right imbalances.', dict(src=NT)),
 'Dumbbell_One-Arm_Triceps_Extension': ('arms', T, 8.0, 'Lying one-arm extension; good stretch, easy on elbows.', dict(src=NT, bench=True)),
 'Seated_Triceps_Press': ('arms', T, 8.0, 'Seated two-hand overhead extension; stable and loadable.', dict(src=NT)),
 'Lying_Dumbbell_Tricep_Extension': ('arms', T, 8.0, 'DB skull crusher: skull crushers are S-tier with a bar; DB version is close.', dict(src=NT, bench=True)),
 'Decline_Dumbbell_Triceps_Extension': ('arms', T, 7.0, 'Decline skull crusher; needs a decline bench.', dict(src=NT, bench=True)),
 'Dumbbell_Tricep_Extension_-Pronated_Grip': ('arms', T, 7.0, 'Lying extension, palms down.', dict(src=C, bench=True)),
 'One_Arm_Pronated_Dumbbell_Triceps_Extension': ('arms', T, 6.5, 'Lying cross-body extension; light loads.', dict(src=C, bench=True)),
 'One_Arm_Supinated_Dumbbell_Triceps_Extension': ('arms', T, 6.5, 'Lying, palm-up extension; light loads.', dict(src=C, bench=True)),
 'Tate_Press': ('arms', T, 6.5, 'Elbows-out press; awkward for many elbows (B-tier "French press" family).', dict(src=NT, bench=True)),
 'Tricep_Dumbbell_Kickback': ('arms', T, 7.0, 'Peak contraction with arm behind body; DB version loses tension at the bottom.', dict(src=NT)),
 'Standing_Bent-Over_One-Arm_Dumbbell_Triceps_Extension': ('arms', T, 7.0, 'One-arm kickback, bent over.', dict(src=NT)),
 'Standing_Bent-Over_Two-Arm_Dumbbell_Triceps_Extension': ('arms', T, 6.5, 'Two-arm kickback; harder to keep strict.', dict(src=NT)),
 'Seated_Bent-Over_One-Arm_Dumbbell_Triceps_Extension': ('arms', T, 6.5, 'Seated kickback variation.', dict(src=NT)),
 'Seated_Bent-Over_Two-Arm_Dumbbell_Triceps_Extension': ('arms', T, 6.5, 'Seated two-arm kickback.', dict(src=NT)),
 'Close-Grip_Dumbbell_Press': ('arms', T, 8.0, 'A-tier style compound: close-grip press builds overall triceps strength.', dict(src=NT)),
 'Band_Skull_Crusher': ('arms', T, 6.5, 'Band skull crusher: tension fades at the stretch; useful for travel/finishers.', dict(src=C)),
 'Speed_Band_Overhead_Triceps': ('arms', T, 6.5, 'Fast band overhead extension; high-rep pump finisher.', dict(src=C)),
 # ---------------- ARMS / FOREARMS
 'Seated_Dumbbell_Palms-Up_Wrist_Curl': ('arms', F, 7.5, 'Direct forearm-flexor work; simple, progressive.', dict(src=C, aliases=['DB wrist curl'])),
 'Seated_Dumbbell_Palms-Down_Wrist_Curl': ('arms', F, 7.0, 'Trains forearm extensors; balances flexor work, good for elbow health.', dict(src=C, aliases=['DB reverse wrist curl'])),
 'Seated_One-Arm_Dumbbell_Palms-Up_Wrist_Curl': ('arms', F, 7.5, 'One-arm wrist curl; better range than two-arm.', dict(src=C)),
 'Seated_One-Arm_Dumbbell_Palms-Down_Wrist_Curl': ('arms', F, 7.0, 'One-arm reverse wrist curl.', dict(src=C)),
 'Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench': ('arms', F, 7.5, 'Wrist curl over a bench: full range for the flexors.', dict(src=C, bench=True)),
 'Palms-Down_Dumbbell_Wrist_Curl_Over_A_Bench': ('arms', F, 7.0, 'Reverse wrist curl over a bench.', dict(src=C, bench=True)),
 'Dumbbell_Lying_Pronation': ('arms', F, 6.0, 'Rotational forearm work; rehab / elbow-health accessory.', dict(src=C, bench=True)),
 'Dumbbell_Lying_Supination': ('arms', F, 6.0, 'Rotational forearm work; rehab / elbow-health accessory.', dict(src=C, bench=True)),
 # ---------------- SHOULDERS
 'Dumbbell_Shoulder_Press': ('shoulders', 'front-delts', 8.5, 'A-tier and top front-delt EMG in ACE; also hits side delts.', dict(src=NS+AS, aliases=['DB shoulder press'])),
 'Seated_Dumbbell_Press': ('shoulders', 'front-delts', 8.5, 'Seated version: more stable, easier to push hard.', dict(src=NS+AS)),
 'Standing_Dumbbell_Press': ('shoulders', 'front-delts', 8.0, 'Standing press; adds core demand, slightly less stable.', dict(src=NS)),
 'Standing_Alternating_Dumbbell_Press': ('shoulders', 'front-delts', 7.5, 'Alternating press; anti-lean core challenge.', dict(src=NS)),
 'Dumbbell_One-Arm_Shoulder_Press': ('shoulders', 'front-delts', 7.5, 'One-arm press: fixes imbalances, trains core.', dict(src=NS)),
 'Standing_Palms-In_Dumbbell_Press': ('shoulders', 'front-delts', 8.0, 'Neutral-grip press: shoulder-friendly.', dict(src=NS)),
 'Standing_Palm-In_One-Arm_Dumbbell_Press': ('shoulders', 'front-delts', 7.5, 'One-arm neutral-grip press.', dict(src=NS)),
 'Arnold_Dumbbell_Press': ('shoulders', 'front-delts', 8.0, 'Rotation adds front + side delt range; slightly lighter loads.', dict(src=C, aliases=['DB Arnold press'])),
 'See-Saw_Press_Alternating_Side_Press': ('shoulders', 'front-delts', 6.0, 'Side-bend press; more core/coordination than delt growth.', dict(src=C)),
 'Shoulder_Press_-_With_Bands': ('shoulders', 'front-delts', 7.0, 'Band press: hardest at lockout; good home/travel option.', dict(src=C, aliases=['Band overhead press'])),
 'Front_Dumbbell_Raise': ('shoulders', 'front-delts', 5.0, 'D-tier: front delts already get plenty from pressing.', dict(src=NS+AS)),
 'Front_Two-Dumbbell_Raise': ('shoulders', 'front-delts', 5.0, 'D-tier front raise (both arms).', dict(src=NS)),
 'Front_Incline_Dumbbell_Raise': ('shoulders', 'front-delts', 5.0, 'Incline front raise; D-tier family.', dict(src=NS, bench=True)),
 'Single_Dumbbell_Raise': ('shoulders', 'front-delts', 4.5, 'Plate-style single DB front raise; D-tier.', dict(src=NS)),
 'Standing_Dumbbell_Straight-Arm_Front_Delt_Raise_Above_Head': ('shoulders', 'front-delts', 5.0, 'Full-range front raise; still D-tier family.', dict(src=NS)),
 'Dumbbell_Raise': ('shoulders', 'front-delts', 5.0, 'Front raise variant; low priority.', dict(src=NS)),
 'Dumbbell_Incline_Shoulder_Raise': ('shoulders', 'front-delts', 5.5, 'Lying serratus/front delt raise; accessory.', dict(src=C, bench=True)),
 'Side_Lateral_Raise': ('shoulders', 'side-delts', 8.0, 'B-tier by Nippard (little tension at bottom), but the #1 home side-delt builder for wider shoulders.', dict(src=NS, aliases=['DB lateral raise'])),
 'Seated_Side_Lateral_Raise': ('shoulders', 'side-delts', 8.0, 'Seated lateral: stricter, less cheating.', dict(src=NS)),
 'One-Arm_Side_Laterals': ('shoulders', 'side-delts', 8.5, 'Hold a post + lean away/in: lean-in lateral raise is A-tier (more tension at stretch).', dict(src=NS)),
 'Lying_One-Arm_Lateral_Raise': ('shoulders', 'side-delts', 8.5, 'Side-lying lateral raise: A-tier, high tension in the stretch.', dict(src=NS, bench=True)),
 'One-Arm_Incline_Lateral_Raise': ('shoulders', 'side-delts', 8.0, 'Incline side-lying raise; tension at the bottom.', dict(src=NS, bench=True)),
 'Alternating_Deltoid_Raise': ('shoulders', 'side-delts', 6.0, 'Front-to-side combo; less focused.', dict(src=C)),
 'Side_Laterals_to_Front_Raise': ('shoulders', 'side-delts', 6.0, 'Combo raise; fine pump finisher, not optimal.', dict(src=C)),
 'Power_Partials': ('shoulders', 'side-delts', 5.5, 'Partial-range laterals; finisher only.', dict(src=C)),
 'Dumbbell_Scaption': ('shoulders', 'side-delts', 7.0, 'Y-plane raise: shoulder-friendly, hits side delts + lower traps.', dict(src=C)),
 'Lateral_Raise_-_With_Bands': ('shoulders', 'side-delts', 6.0, 'C-tier: zero tension at the bottom, but works anywhere.', dict(src=NS, aliases=['Band lateral raise'])),
 'Standing_Dumbbell_Upright_Row': ('shoulders', 'side-delts', 5.0, 'D-tier: mostly traps; can pinch shoulders. Use a wide grip, stop at chest height.', dict(src=NS)),
 'Dumbbell_One-Arm_Upright_Row': ('shoulders', 'side-delts', 5.0, 'D-tier upright row (one arm).', dict(src=NS)),
 'Upright_Row_-_With_Bands': ('shoulders', 'side-delts', 5.0, 'Band upright row; D-tier family.', dict(src=NS)),
 'Reverse_Flyes': ('shoulders', 'rear-delts', 7.5, 'B-tier bent-over reverse fly: the best rear-delt option without cables.', dict(src=NS, aliases=['DB reverse fly'])),
 'Seated_Bent-Over_Rear_Delt_Raise': ('shoulders', 'rear-delts', 8.0, 'Top rear-delt EMG in the ACE study.', dict(src=AS)),
 'Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench': ('shoulders', 'rear-delts', 8.0, 'Head-supported = no cheating; strict rear delts.', dict(src=AS, bench=True)),
 'Lying_Rear_Delt_Raise': ('shoulders', 'rear-delts', 8.0, 'Chest-supported rear raise; stable and strict.', dict(src=C, bench=True)),
 'Dumbbell_Lying_Rear_Lateral_Raise': ('shoulders', 'rear-delts', 8.0, 'Chest-supported rear lateral; great isolation.', dict(src=C, bench=True)),
 'Dumbbell_Lying_One-Arm_Rear_Lateral_Raise': ('shoulders', 'rear-delts', 7.5, 'Side-lying one-arm rear delt raise.', dict(src=C, bench=True)),
 'Reverse_Flyes_With_External_Rotation': ('shoulders', 'rear-delts', 7.0, 'Rear delts + rotator cuff in one; light loads.', dict(src=C)),
 'Back_Flyes_-_With_Bands': ('shoulders', 'rear-delts', 7.0, 'Band reverse fly: constant tension; great home option.', dict(src=C, aliases=['Band reverse fly'])),
 'Band_Pull_Apart': ('shoulders', 'rear-delts', 7.5, 'Posture + rear-delt staple; perfect warm-up or high-rep finisher.', dict(src=C, aliases=['Band pull-apart', 'Warm-up: Banded pull-apart'])),
 'External_Rotation': ('shoulders', 'rotator-cuff', 7.0, 'Rotator-cuff health; protects shoulders during pressing.', dict(src=C)),
 'External_Rotation_with_Band': ('shoulders', 'rotator-cuff', 7.5, 'Band external rotation: easiest way to train the cuff at home.', dict(src=C)),
 'Internal_Rotation_with_Band': ('shoulders', 'rotator-cuff', 6.5, 'Internal rotation; balances external work (prehab).', dict(src=C)),
 'Cuban_Press': ('shoulders', 'rotator-cuff', 6.5, 'Upright row + rotation + press; prehab, light weights only.', dict(src=C)),
 'Dumbbell_Shrug': ('shoulders', 'traps', 7.5, 'Simple, heavy, effective upper-trap builder.', dict(src=C)),
 # ---------------- CHEST
 'Dumbbell_Bench_Press': ('chest', 'press', 8.5, 'Tier 2 by Nippard: deep stretch, very effective for chest.', dict(src=NC, bench=True)),
 'Dumbbell_Bench_Press_with_Neutral_Grip': ('chest', 'press', 8.0, 'Neutral-grip press: shoulder-friendly, more triceps.', dict(src=NC, bench=True)),
 'One_Arm_Dumbbell_Bench_Press': ('chest', 'press', 5.5, 'Ranked in the lowest chest tier (unstable); use as a core challenge.', dict(src=NC, bench=True)),
 'Dumbbell_Floor_Press': ('chest', 'press', 7.0, 'Tier 4: limited range (less stretch), but no bench needed and very shoulder/elbow-friendly.', dict(src=NC, aliases=['DB floor press'], album_from='triceps')),
 'Bench_Press_-_With_Bands': ('chest', 'press', 6.5, 'Band press: tension peaks at lockout; good home option.', dict(src=C, aliases=['Band chest press'])),
 'Decline_Dumbbell_Bench_Press': ('chest', 'press', 6.5, 'Tier 3: lower-chest bias, which most people don\'t need.', dict(src=NC, bench=True)),
 'Incline_Dumbbell_Press': ('chest', 'incline', 8.5, 'Tier 2: upper chest is usually the lagging area.', dict(src=NC, bench=True)),
 'Hammer_Grip_Incline_DB_Bench_Press': ('chest', 'incline', 8.0, 'Neutral-grip incline: joint-friendly upper chest.', dict(src=NC, bench=True)),
 'Incline_Dumbbell_Bench_With_Palms_Facing_In': ('chest', 'incline', 8.0, 'Neutral-grip incline press.', dict(src=NC, bench=True)),
 'Dumbbell_Flyes': ('chest', 'fly', 7.5, 'Tier 2: big stretch; keep weights moderate.', dict(src=NC, bench=True)),
 'One-Arm_Flat_Bench_Dumbbell_Flye': ('chest', 'fly', 6.5, 'Unilateral fly; adds core anti-rotation.', dict(src=C, bench=True)),
 'Incline_Dumbbell_Flyes': ('chest', 'fly', 7.5, 'Upper-chest fly with good stretch.', dict(src=NC, bench=True)),
 'Incline_Dumbbell_Flyes_-_With_A_Twist': ('chest', 'fly', 7.0, 'Incline fly with a twist at the top.', dict(src=C, bench=True)),
 'Decline_Dumbbell_Flyes': ('chest', 'fly', 6.0, 'Lower-chest fly; low priority.', dict(src=NC, bench=True)),
 'Cross_Over_-_With_Bands': ('chest', 'fly', 7.0, 'Band crossover: good squeeze, tension at the top.', dict(src=C)),
 'Around_The_Worlds': ('chest', 'fly', 5.0, 'Light circular fly; shoulder-mobility style, low stimulus.', dict(src=C, bench=True)),
 'Bent-Arm_Dumbbell_Pullover': ('chest', 'fly', 6.0, 'Tier 5 for chest (better as a lat move).', dict(src=NC, bench=True)),
 # ---------------- BACK
 'Straight-Arm_Dumbbell_Pullover': ('back', 'lats', 8.0, 'Tier 2 back: "extremely effective" lat stretch.', dict(src=NBK, bench=True)),
 'One-Arm_Dumbbell_Row': ('back', 'mid-back', 8.5, 'Tier 2 (Kroc/one-arm row): heavy, braced, lats + mid back.', dict(src=NBK)),
 'Bent_Over_Two-Dumbbell_Row': ('back', 'mid-back', 8.0, 'Tier 2 bent-over DB row; both arms at once.', dict(src=NBK, aliases=['DB bent-over row'])),
 'Bent_Over_Two-Dumbbell_Row_With_Palms_In': ('back', 'mid-back', 8.0, 'Neutral grip pulls more lats.', dict(src=NBK)),
 'Dumbbell_Incline_Row': ('back', 'mid-back', 9.0, 'Chest-supported row: Tier 1 back, and top side/rear delt EMG in ACE.', dict(src=NBK+AS, bench=True)),
 'Middle_Back_Shrug': ('back', 'mid-back', 6.0, 'Retraction shrug; accessory for posture.', dict(src=C, bench=True)),
 # ---------------- LEGS
 'Stiff-Legged_Dumbbell_Deadlift': ('legs', 'hamstrings', 8.5, 'RDL family: A-tier for glutes, great hamstring stretch, knee-friendly hinge.', dict(src=NG, knee='friendly', aliases=['DB Romanian deadlift', 'DB RDL'])),
 'Band_Good_Morning': ('legs', 'hamstrings', 6.5, 'Band hinge; safe, teaches the hip hinge.', dict(src=C, knee='friendly', aliases=['Band good morning'])),
 'Band_Good_Morning_Pull_Through': ('legs', 'hamstrings', 6.5, 'Pull-through: B-tier glutes; beginner-friendly.', dict(src=NG, knee='friendly')),
 'Dumbbell_Squat': ('legs', 'quads', 7.5, 'Simple DB squat; load is limited by grip.', dict(src=NQ, knee='caution')),
 'Dumbbell_Squat_To_A_Bench': ('legs', 'quads', 7.5, 'Box/bench target controls depth: knee-friendly squat pattern.', dict(src=NQ, knee='caution', bench=True)),
 'Plie_Dumbbell_Squat': ('legs', 'quads', 7.0, 'Wide-stance squat: more adductors/glutes.', dict(src=C, knee='caution')),
 'Squats_-_With_Bands': ('legs', 'quads', 6.0, 'Band squat; light, easiest at the bottom.', dict(src=C, knee='caution')),
 'Split_Squat_with_Dumbbells': ('legs', 'quads', 8.5, 'Bulgarian/split squat is S-tier quads, but stressful on sore knees: go shallow.', dict(src=NQ, knee='avoid')),
 'Dumbbell_Lunges': ('legs', 'quads', 8.0, 'B-tier quads, S-tier glutes (walking lunge). Deep knee flexion.', dict(src=NQ+NG, knee='avoid')),
 'Dumbbell_Rear_Lunge': ('legs', 'quads', 8.0, 'Reverse lunge: kinder to knees than forward lunges, still high stimulus.', dict(src=NG, knee='caution')),
 'Dumbbell_Step_Ups': ('legs', 'quads', 7.5, 'C-tier quads / A-tier glutes; keep the box low for the knee.', dict(src=NQ+NG, knee='caution')),
 'Dumbbell_Seated_Box_Jump': ('legs', 'quads', 3.5, 'Plyometric jump: F-tier for growth and a knee risk.', dict(src=NQ, knee='avoid')),
 'Hip_Flexion_with_Band': ('legs', 'hips', 5.5, 'Hip-flexor strength; prehab/mobility.', dict(src=C, knee='friendly')),
 'Hip_Extension_with_Bands': ('legs', 'glutes', 6.5, 'Band kickback-style hip extension; glute finisher.', dict(src=NG, knee='friendly')),
 'Hip_Lift_with_Band': ('legs', 'glutes', 7.0, 'Banded glute bridge: knee-friendly glute work.', dict(src=NG, knee='friendly')),
 'Monster_Walk': ('legs', 'hips', 6.0, 'C-tier (banded walks): low tension, great glute-med warm-up.', dict(src=NG, knee='friendly')),
 'Band_Hip_Adductions': ('legs', 'hips', 6.0, 'Inner-thigh work; accessory.', dict(src=C, knee='friendly')),
 'Standing_Dumbbell_Calf_Raise': ('legs', 'calves', 7.5, 'Loaded standing calf raise; pause at the bottom stretch.', dict(src=C, knee='friendly', aliases=['Standing calf raise'])),
 'Calf_Raise_On_A_Dumbbell': ('legs', 'calves', 7.5, 'Elevated toes = bigger stretch.', dict(src=C, knee='friendly')),
 'Dumbbell_Seated_One-Leg_Calf_Raise': ('legs', 'calves', 6.5, 'Seated = soleus focus.', dict(src=C, knee='friendly', aliases=['Seated calf raise'])),
 'Calf_Raises_-_With_Bands': ('legs', 'calves', 6.0, 'Band calf raise; light, home-friendly.', dict(src=C, knee='friendly')),
 # ---------------- CORE
 'Dumbbell_Side_Bend': ('core', 'obliques', 6.0, 'Simple oblique work; keep moderate weight.', dict(src=C)),
 'Spell_Caster': ('core', 'obliques', 6.0, 'Rotational DB swing; coordination + obliques.', dict(src=C)),
 # ---------------- FULL BODY
 'Dumbbell_Clean': ('full-body', 'conditioning', 6.5, 'Power move; technique-heavy, raises heart rate.', dict(src=C, knee='caution')),
 'Vertical_Swing': ('full-body', 'conditioning', 6.0, 'DB swing: D-tier for glute growth, good for conditioning.', dict(src=NG, knee='caution')),
 'Iron_Cross': ('full-body', 'compound', 5.0, 'Squat + raise combo; F-tier "combo" family, low per-muscle stimulus.', dict(src=NQ, knee='caution')),
}

# Muscle-group defaults for knee flags
KNEE_DEFAULT = {'legs': 'caution', 'full-body': 'caution'}

# --------------------------------------------------------------------------------------
# Hand-added moves missing from the DB. imageFrom = DB id with a close demo (may show
# kettlebell/cable/bodyweight; imageNote tells the user). equip: dumbbell|band|bodyweight
# --------------------------------------------------------------------------------------
ADD = [
 # id, name, equip, album, sub, level, score, reason, imageFrom, opts
 ('Band_Biceps_Curl', 'Band biceps curl', 'band', 'arms', B, 'beginner', 6.5, 'Tension peaks at the top; good finisher or travel option.', 'Close-Grip_EZ-Bar_Curl_with_Band', dict(src=C, aliases=['Band biceps curl'])),
 ('Band_Face_Away_Curl', 'Band face-away (Bayesian) curl', 'band', 'arms', B, 'intermediate', 7.5, 'Band version of the S-tier face-away cable curl: stretch on the long head.', None, dict(src=NB)),
 ('Band_Triceps_Pushdown', 'Band triceps pushdown', 'band', 'arms', T, 'beginner', 6.5, 'B-tier pushdown; anchor band high (door anchor).', 'Triceps_Pushdown_-_Rope_Attachment', dict(src=NT, aliases=['Band triceps pushdown'])),
 ('Band_Overhead_Triceps_Extension', 'Band overhead triceps extension', 'band', 'arms', T, 'beginner', 7.5, 'Overhead = long-head stretch (A-tier pattern with cables).', 'Speed_Band_Overhead_Triceps', dict(src=NT)),
 ('Band_Triceps_Kickback', 'Band triceps kickback', 'band', 'arms', T, 'beginner', 7.0, 'Band keeps tension at full lockout (cable kickback is A-tier).', 'Tricep_Dumbbell_Kickback', dict(src=NT)),
 ('Bench_Dip', 'Bench / chair dip', 'bodyweight', 'arms', T, 'beginner', 5.5, 'C-tier: hard to progress and can stress the shoulder front.', None, dict(src=NT, aliases=['Bench dip'])),
 ('Diamond_Push_Up', 'Diamond / close-grip push-up', 'bodyweight', 'arms', T, 'intermediate', 7.0, 'B-tier finisher; no equipment.', 'Push-Ups_-_Close_Triceps_Position', dict(src=NT)),
 ('Farmer_Carry_Hold', 'Farmer carry / hold (dumbbells)', 'dumbbell', 'arms', F, 'beginner', 8.0, 'Best grip + forearm builder; also trains core and traps.', 'Farmers_Walk', dict(src=C, aliases=['Farmer carry hold'])),
 ('DB_Reverse_Wrist_Curl_Std', 'Band wrist extension', 'band', 'arms', F, 'beginner', 6.0, 'Elbow-friendly extensor work (tennis-elbow prehab).', None, dict(src=C)),
 ('Band_Grip_Squeeze', 'Band grip squeeze / finger extension', 'band', 'arms', F, 'beginner', 5.0, 'Hand/grip endurance; prehab.', None, dict(src=C, aliases=['Band grip squeeze'])),
 ('DB_Lean_In_Lateral', 'Lean-in DB lateral raise', 'dumbbell', 'shoulders', 'side-delts', 'beginner', 8.5, 'A-tier: leaning shifts tension to the stretched position.', 'One-Arm_Side_Laterals', dict(src=NS)),
 ('Band_Face_Pull', 'Band face pull', 'band', 'shoulders', 'rear-delts', 'beginner', 8.0, 'A-tier with rope/cable; band version is the best home rear-delt + posture move.', 'Face_Pull', dict(src=NS, aliases=['Band face pull'])),
 ('Band_Y_Raise', 'Band Y-raise', 'band', 'shoulders', 'side-delts', 'beginner', 7.0, 'Band take on the S-tier cable Y-raise; lower traps + side delts.', None, dict(src=NS)),
 ('DB_Halo', 'Dumbbell halo', 'dumbbell', 'shoulders', 'rotator-cuff', 'beginner', 5.5, 'Shoulder mobility warm-up; low loading.', 'Kettlebell_Halo', dict(src=C)),
 ('Band_Upright_Shrug', 'Band shrug', 'band', 'shoulders', 'traps', 'beginner', 5.5, 'Light trap work; dumbbell shrug is better.', None, dict(src=C)),
 ('Push_Up', 'Push-up', 'bodyweight', 'chest', 'push-up', 'beginner', 6.5, 'Tier 4 for chest (limited stretch/load), but a great base movement.', 'Pushups', dict(src=NC)),
 ('Incline_Push_Up', 'Incline push-up (hands elevated)', 'bodyweight', 'chest', 'push-up', 'beginner', 6.0, 'Easier push-up regression; build to floor push-ups.', 'Incline_Push-Up', dict(src=C, aliases=['Incline push-up (hands elevated)'])),
 ('Knee_Push_Up', 'Knee push-up', 'bodyweight', 'chest', 'push-up', 'beginner', 5.0, 'Beginner regression.', None, dict(src=C, aliases=['Knee push-up'], knee='caution')),
 ('Wall_Push_Up', 'Wall push-up', 'bodyweight', 'chest', 'push-up', 'beginner', 4.0, 'Easiest regression; warm-up level.', None, dict(src=C, aliases=['Wall push-up'])),
 ('Deficit_Push_Up_DB', 'Deficit push-up on dumbbells', 'dumbbell', 'chest', 'push-up', 'intermediate', 7.5, 'Tier 2: hands on dumbbells add stretch.', 'Close-Grip_Push-Up_off_of_a_Dumbbell', dict(src=NC)),
 ('Banded_Push_Up', 'Banded push-up', 'band', 'chest', 'push-up', 'intermediate', 6.5, 'Tier 3: band adds load at the top.', None, dict(src=NC)),
 ('Band_Chest_Fly', 'Band chest fly (anchored behind)', 'band', 'chest', 'fly', 'beginner', 7.0, 'Band fly approximates a cable fly; constant tension.', 'Cross_Over_-_With_Bands', dict(src=NC)),
 ('Band_Lat_Pulldown', 'Band lat pulldown (anchored high)', 'band', 'back', 'lats', 'beginner', 7.5, 'Lat pulldowns are Tier 1; band version is the best home substitute.', 'Wide-Grip_Lat_Pulldown', dict(src=NBK, aliases=['Band lat pulldown'])),
 ('Band_Single_Arm_Pulldown', 'Half-kneeling single-arm band pulldown', 'band', 'back', 'lats', 'beginner', 7.5, 'Tier 1 pattern (one-arm pulldown); great lat focus.', 'One_Arm_Lat_Pulldown', dict(src=NBK)),
 ('Band_Straight_Arm_Pulldown', 'Band straight-arm pulldown', 'band', 'back', 'lats', 'beginner', 7.0, 'Lat isolation (pullover pattern).', 'Cable_Incline_Pushdown', dict(src=NBK, aliases=['Band straight-arm pulldown'])),
 ('Band_Assisted_Pull_Up', 'Band-assisted pull-up', 'band', 'back', 'lats', 'intermediate', 8.0, 'Tier 2 pull-up; needs a bar.', 'Band_Assisted_Pull-Up', dict(src=NBK)),
 ('Band_Seated_Row', 'Band seated row', 'band', 'back', 'mid-back', 'beginner', 7.5, 'Seated rows are Tier 1 with cable; band version keeps tension at the squeeze.', 'Seated_Cable_Rows', dict(src=NBK, aliases=['Band row (seated)', 'Band row'])),
 ('Band_Single_Arm_Row', 'Band single-arm row', 'band', 'back', 'mid-back', 'beginner', 7.0, 'One-arm cable-style row.', 'Seated_One-arm_Cable_Pulley_Rows', dict(src=NBK)),
 ('Renegade_Row', 'Renegade row', 'dumbbell', 'back', 'mid-back', 'intermediate', 4.5, 'Tier 6 for back (core-dominant); use it as a core move.', 'Alternating_Renegade_Row', dict(src=NBK)),
 ('Superman', 'Superman', 'bodyweight', 'back', 'lower-back', 'beginner', 5.5, 'Lower-back endurance; no equipment.', 'Superman', dict(src=C, aliases=['Superman'])),
 ('Bird_Dog', 'Bird dog', 'bodyweight', 'core', 'stability', 'beginner', 7.0, 'McGill "big 3" spine-stability move; back-safe.', None, dict(src=C, aliases=['Bird dog'])),
 ('Band_Deadlift', 'Band deadlift', 'band', 'back', 'lower-back', 'beginner', 6.0, 'Tier 4 (deadlifts) for back; safe hinge practice.', 'Deadlift_with_Bands', dict(src=NBK, knee='friendly')),
 ('Dead_Bug', 'Dead bug', 'bodyweight', 'core', 'stability', 'beginner', 8.0, 'Spine-safe anti-extension; teaches bracing. Add a DB or band to progress.', 'Dead_Bug', dict(src=C, aliases=['Dead bug'])),
 ('Forearm_Plank', 'Forearm plank', 'bodyweight', 'core', 'stability', 'beginner', 7.0, 'Bracing staple; progress by time or add a band/weight.', 'Plank', dict(src=C, aliases=['Forearm plank', 'Knee plank'])),
 ('Side_Plank', 'Side plank', 'bodyweight', 'core', 'obliques', 'beginner', 7.5, 'McGill big-3: obliques + QL with no spine flexion.', 'Side_Bridge', dict(src=C, aliases=['Side plank', 'Knee side plank'])),
 ('Band_Pallof_Press', 'Band Pallof press', 'band', 'core', 'stability', 'beginner', 8.0, 'Best anti-rotation move; back-friendly.', 'Pallof_Press', dict(src=C)),
 ('Band_Woodchop', 'Band woodchop', 'band', 'core', 'obliques', 'beginner', 7.0, 'Rotational power for obliques.', 'Standing_Cable_Wood_Chop', dict(src=C)),
 ('DB_Russian_Twist', 'Russian twist (dumbbell, slow)', 'dumbbell', 'core', 'obliques', 'intermediate', 6.0, 'Popular, but loaded spinal twisting; keep it slow and light.', 'Russian_Twist', dict(src=C, aliases=['Russian twist (slow)', 'Seated twist'])),
 ('Bicycle_Crunch', 'Bicycle crunch', 'bodyweight', 'core', 'abs', 'beginner', 8.0, 'Top rectus + oblique activation in the ACE ab study.', None, dict(src=['ace-abs'], aliases=['Bicycle crunch (slow)'])),
 ('DB_Weighted_Crunch', 'Weighted crunch (dumbbell)', 'dumbbell', 'core', 'abs', 'beginner', 7.0, 'Loadable crunch, so the abs can actually progress.', 'Weighted_Crunches', dict(src=C)),
 ('Band_Kneeling_Crunch', 'Band kneeling crunch', 'band', 'core', 'abs', 'beginner', 7.5, 'Band version of the cable crunch: loadable ab flexion.', 'Cable_Crunch', dict(src=C)),
 ('Reverse_Crunch', 'Reverse crunch', 'bodyweight', 'core', 'abs', 'beginner', 7.0, 'Lower-ab emphasis; no equipment.', 'Reverse_Crunch', dict(src=['ace-abs'])),
 ('DB_Suitcase_Carry', 'Suitcase carry (one dumbbell)', 'dumbbell', 'core', 'obliques', 'beginner', 8.0, 'Anti-lateral-flexion carry: obliques + grip; very functional.', 'Farmers_Walk', dict(src=C)),
 ('DB_Goblet_Squat', 'Goblet squat (dumbbell)', 'dumbbell', 'legs', 'quads', 'beginner', 7.5, 'B-tier quads; the best DB squat. Squat to a box for knee control.', 'Goblet_Squat', dict(src=NQ, knee='caution', aliases=['DB goblet squat (box, partial)'])),
 ('Wall_Sit', 'Wall sit', 'bodyweight', 'legs', 'quads', 'beginner', 5.5, 'Isometric quad endurance; shallow angle is knee-friendly.', None, dict(src=C, knee='caution', aliases=['Wall sit'])),
 ('Sit_To_Stand', 'Sit-to-stand (chair, partial)', 'bodyweight', 'legs', 'quads', 'beginner', 5.0, 'Knee-rehab-friendly squat pattern.', 'Chair_Squat', dict(src=C, knee='friendly', aliases=['Sit-to-stand (chair, partial)', 'Sit-to-stand (chair)'])),
 ('Band_Reverse_Nordic', 'Reverse Nordic (band-assisted)', 'band', 'legs', 'quads', 'advanced', 7.5, 'A-tier quad stretch, but high knee stress: avoid with knee pain.', None, dict(src=NQ, knee='avoid')),
 ('DB_Bulgarian_Split_Squat', 'Bulgarian split squat (dumbbell)', 'dumbbell', 'legs', 'quads', 'intermediate', 9.0, 'S-tier quads, A-tier glutes. High knee demand, so go shallow or skip.', 'Split_Squats', dict(src=NQ+NG, knee='avoid', bench=True)),
 ('DB_Walking_Lunge', 'Walking lunge (dumbbell)', 'dumbbell', 'legs', 'glutes', 'intermediate', 9.0, 'S-tier glutes. Deep knee flexion; avoid during knee pain.', 'Bodyweight_Walking_Lunge', dict(src=NG, knee='avoid')),
 ('DB_Hip_Thrust', 'Dumbbell hip thrust', 'dumbbell', 'legs', 'glutes', 'beginner', 8.0, 'B-tier (barbell) / A-tier single-leg; knee-friendly glute builder.', 'Barbell_Hip_Thrust', dict(src=NG, knee='friendly', bench=True, aliases=['Hip thrust (bench)'])),
 ('DB_Single_Leg_Hip_Thrust', 'Single-leg dumbbell hip thrust', 'dumbbell', 'legs', 'glutes', 'intermediate', 8.5, 'A-tier: hits the whole glute, upper-glute emphasis.', 'Single_Leg_Glute_Bridge', dict(src=NG, knee='friendly', bench=True)),
 ('Glute_Bridge', 'Glute bridge (DB on hips)', 'dumbbell', 'legs', 'glutes', 'beginner', 7.0, 'B-tier: easy setup, ideal for beginners and knee-friendly.', 'Butt_Lift_Bridge', dict(src=NG, knee='friendly', aliases=['Glute bridge', 'Glute bridge hold'])),
 ('Single_Leg_Glute_Bridge', 'Single-leg glute bridge', 'bodyweight', 'legs', 'glutes', 'beginner', 7.0, 'Unilateral bridge; more glute per rep.', 'Single_Leg_Glute_Bridge', dict(src=NG, knee='friendly', aliases=['Single-leg glute bridge'])),
 ('Band_Glute_Kickback', 'Band glute kickback', 'band', 'legs', 'glutes', 'beginner', 7.5, 'Kickbacks are A-tier for upper glutes.', 'One-Legged_Cable_Kickback', dict(src=NG, knee='friendly')),
 ('Banded_Hip_Abduction', 'Banded hip abduction (seated)', 'band', 'legs', 'hips', 'beginner', 7.5, 'Machine abduction is S-tier; seated band version is the home match.', None, dict(src=NG, knee='friendly', aliases=['Banded hip abduction'])),
 ('Clamshell', 'Banded clamshell', 'band', 'legs', 'hips', 'beginner', 6.0, 'Glute-med activation; knee-health prehab.', None, dict(src=C, knee='friendly', aliases=['Clamshell'])),
 ('Side_Lying_Leg_Raise', 'Side-lying leg raise', 'bodyweight', 'legs', 'hips', 'beginner', 5.0, 'Glute-med endurance; add a band to progress.', None, dict(src=C, knee='friendly', aliases=['Side-lying leg raise'])),
 ('Lateral_Band_Walk', 'Lateral band walk', 'band', 'legs', 'hips', 'beginner', 6.0, 'C-tier for growth, great warm-up for knee alignment.', 'Monster_Walk', dict(src=NG, knee='friendly')),
 ('Band_Hamstring_Curl', 'Band lying / seated hamstring curl', 'band', 'legs', 'hamstrings', 'beginner', 7.0, 'Knee-flexion hamstring work, so it complements the RDL.', 'Seated_Band_Hamstring_Curl', dict(src=C, knee='caution')),
 ('DB_Single_Leg_RDL', 'Single-leg Romanian deadlift (dumbbell)', 'dumbbell', 'legs', 'hamstrings', 'intermediate', 8.0, 'Unilateral hinge: glutes, hamstrings and balance.', None, dict(src=NG, knee='friendly')),
 ('DB_Hip_Hinge', 'DB hip hinge (light, patterning)', 'dumbbell', 'legs', 'hamstrings', 'beginner', 6.0, 'Teaches the RDL pattern.', None, dict(src=C, knee='friendly', aliases=['DB hip hinge'])),
 ('DB_Thruster', 'Dumbbell thruster (light, partial)', 'dumbbell', 'full-body', 'conditioning', 'intermediate', 6.0, 'F-tier for muscle ("combo"), but a strong calorie burner.', 'Kettlebell_Thruster', dict(src=NQ, knee='caution', aliases=['DB thruster (light, partial)', 'Band thruster'])),
 ('DB_Push_Press', 'Dumbbell push press (partial dip)', 'dumbbell', 'full-body', 'compound', 'intermediate', 6.5, 'Leg drive lets you overload the press.', None, dict(src=C, knee='caution', aliases=['DB push press (partial)'])),
 ('DB_Man_Maker', 'Dumbbell man-maker', 'dumbbell', 'full-body', 'conditioning', 'advanced', 4.5, 'Brutal conditioning combo; low per-muscle stimulus, involves a jump-back.', None, dict(src=NQ, knee='avoid')),
 ('DB_Snatch', 'Single-arm dumbbell snatch', 'dumbbell', 'full-body', 'conditioning', 'advanced', 6.0, 'Explosive power + conditioning; technique first.', 'One-Arm_Kettlebell_Snatch', dict(src=C, knee='caution')),
 ('DB_Turkish_Get_Up', 'Turkish get-up (dumbbell)', 'dumbbell', 'full-body', 'compound', 'advanced', 7.0, 'Total-body stability and shoulder health; slow and skillful.', 'Kettlebell_Turkish_Get-Up_Squat_style', dict(src=C, knee='caution')),
 ('DB_Windmill', 'Dumbbell windmill', 'dumbbell', 'full-body', 'compound', 'intermediate', 6.0, 'Mobility + obliques + shoulder stability.', 'Kettlebell_Windmill', dict(src=C)),
 ('DB_Squat_To_Press', 'Squat to press (dumbbell)', 'dumbbell', 'full-body', 'conditioning', 'beginner', 5.5, 'Combo move: F-tier for growth, fine for circuits.', None, dict(src=NQ, knee='caution')),
 ('March_Arm_Drive', 'March + arm drive (fast)', 'bodyweight', 'full-body', 'conditioning', 'beginner', 5.0, 'Zero-impact cardio; knee-safe heart-rate work.', None, dict(src=C, knee='friendly', aliases=['March + arm drive (fast)', 'Step touch (fast)', 'Standing march'])),
 ('Band_Fast_Punches', 'Band fast punches', 'band', 'full-body', 'conditioning', 'beginner', 5.0, 'Low-impact conditioning for shoulders + core.', None, dict(src=C, knee='friendly', aliases=['Band fast punches', 'Shadow boxing'])),
 ('Standing_Knee_Lift', 'Standing knee lift (controlled)', 'bodyweight', 'core', 'abs', 'beginner', 4.5, 'Low-impact core/hip-flexor work.', None, dict(src=C, knee='caution', aliases=['Standing knee lift (controlled)'])),
]

ALBUM_ORDER = {a: i for i, (a, _, _) in enumerate(ALBUMS)}
SUB_ORDER = {(a, s): j for a, _, subs in ALBUMS for j, (s, _) in enumerate(subs)}
LEVEL = {'beginner': 'beginner', 'intermediate': 'intermediate', 'expert': 'advanced', 'advanced': 'advanced'}


def pretty(name: str) -> str:
    return name.replace(' - ', ' – ')


def search_url(name: str) -> str:
    q = re.sub(r'\(.*?\)', '', name).strip() + ' exercise proper form'
    from urllib.parse import quote_plus
    return 'https://www.youtube.com/results?search_query=' + quote_plus(q)


def howto_url(name: str) -> str:
    from urllib.parse import quote_plus
    return 'https://www.google.com/search?q=' + quote_plus(re.sub(r'\(.*?\)', '', name).strip() + ' exercise how to')


EQN = {'kettlebells': 'kettlebell', 'body only': 'bodyweight', 'other': 'equipment', 'cable': 'cable-machine', 'e-z curl bar': 'EZ-bar', 'medicine ball': 'medicine-ball', 'machine': 'machine', 'barbell': 'barbell', 'band': 'a resistance band', 'dumbbell': 'dumbbells', 'bodyweight': 'bodyweight only'}
out = []
for id_, (album, sub, score, reason, o) in E.items():
    x = DB[id_]
    eq = {'dumbbell': 'dumbbell', 'bands': 'band'}[x['equipment']]
    out.append(dict(
        id=id_, name=pretty(x['name']), equipment=eq, album=album, subAlbum=sub,
        difficulty=LEVEL[x['level']],
        score=score, scoreReason=reason, sources=o.get('src', C),
        knee=o.get('knee', KNEE_DEFAULT.get(album, 'friendly')),
        needsBench=bool(o.get('bench', False)),
        mechanic=x['mechanic'] or 'compound', force=x['force'],
        primaryMuscles=x['primaryMuscles'], secondaryMuscles=x['secondaryMuscles'],
        instructions=INSTR.get(id_) or x['instructions'],
        images=[f"{IMG_BASE}/{p[:-4]}.webp" for p in x['images']], imageSourceId=id_, imageNote=None,
        aliases=o.get('aliases', []),
        howToUrl=howto_url(x['name']), videoUrl=None, videoSearchUrl=search_url(x['name']),
        origin='free-exercise-db',
    ))

for id_, name, eq, album, sub, lvl, score, reason, img, o in ADD:
    assert id_ not in E, id_
    src_x = DB.get(img) if img else None
    note = None
    se = (src_x or {}).get('equipment')
    show = se in ('kettlebells', 'cable', 'barbell', 'e-z curl bar', 'medicine ball') or (se == 'body only' and eq != 'bodyweight')
    if src_x and show:
        note = f"Demo image shows the {EQN.get(src_x['equipment'], src_x['equipment'])} version; perform it with {EQN.get(eq, eq)}."
    out.append(dict(
        id=id_, name=name, equipment=eq, album=album, subAlbum=sub, difficulty=LEVEL[lvl],
        score=score, scoreReason=reason, sources=o.get('src', C),
        knee=o.get('knee', KNEE_DEFAULT.get(album, 'friendly')),
        needsBench=bool(o.get('bench', False)),
        mechanic=(src_x or {}).get('mechanic') or 'compound', force=(src_x or {}).get('force'),
        primaryMuscles=(src_x or {}).get('primaryMuscles', []), secondaryMuscles=(src_x or {}).get('secondaryMuscles', []),
        instructions=INSTR.get(id_) or (src_x or {}).get('instructions', []),
        images=[f"{IMG_BASE}/{p[:-4]}.webp" for p in (src_x or {}).get('images', [])], imageSourceId=img, imageNote=note,
        aliases=o.get('aliases', []),
        howToUrl=howto_url(name), videoUrl=None, videoSearchUrl=search_url(name),
        origin='curated',
    ))

# sanity: every alias unique
seen = {}
for e in out:
    for a in e['aliases']:
        assert a not in seen, (a, seen.get(a), e['id'])
        seen[a] = e['id']

# curated videos (filled from videos.json if present)
try:
    vids = json.load(open('videos.json'))
    for e in out:
        if e['id'] in vids:
            e['videoUrl'] = vids[e['id']]
except FileNotFoundError:
    pass

out.sort(key=lambda e: (ALBUM_ORDER[e['album']], SUB_ORDER[(e['album'], e['subAlbum'])], -e['score'], e['name']))

catalog = dict(
    version=1,
    generated='2026-10-03',
    license='Exercise text/images from yuhonas/free-exercise-db (Unlicense, public domain). Scores are a composite judgement from the cited sources.',
    scoreScale='0-10 composite: S-tier≈9, A≈8-8.5, B≈7-7.5, C≈6, D≈4.5-5, F≈3.5. Based on muscle-growth evidence (EMG studies + evidence-based coach rankings), not on calorie burn.',
    albums=[dict(id=a, name=n, subAlbums=[dict(id=s, name=sn) for s, sn in subs]) for a, n, subs in ALBUMS],
    sources={k: dict(title=t, url=u) for k, (t, u) in SOURCES.items()},
    exercises=out,
)
json.dump(catalog, open('exerciseCatalog.json', 'w'), indent=1, ensure_ascii=False)
print('exercises', len(out))
import collections
print(collections.Counter((e['album'], e['subAlbum']) for e in out))
print('noimg', [e['id'] for e in out if not e['images']])

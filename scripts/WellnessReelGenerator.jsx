/**
 * WellnessReelGenerator.jsx
 * After Effects 2024 — ExtendScript (V8 engine supported)
 *
 * HOW TO USE:
 *   1. In After Effects: File → Scripts → Run Script File → pick this file.
 *   2. Edit the CONTENT array below with your topics/hooks (or paste from the dashboard).
 *   3. Click "Generate Reels" in the dialog — one comp per post is created automatically.
 *   4. Render via File → Export → Add to Adobe Media Encoder Queue → H.264, Instagram preset.
 *
 * FORMAT: 1080 × 1920 px (9:16), 30 fps, 15 seconds — perfect for Reels & Stories.
 */

// ─────────────────────────────────────────────────────────────
//  EDIT YOUR CONTENT HERE  (copy-paste from the dashboard)
// ─────────────────────────────────────────────────────────────
var CONTENT = [
  {
    day:      "Monday",
    category: "Weight Loss",
    hook:     "Your breakfast might be the reason the scale won't budge.",
    tip1:     "Swap white bread for oats or ragi.",
    tip2:     "Add protein to every morning meal.",
    cta:      "Join FREE 7 PM Zoom Session Tonight →"
  },
  {
    day:      "Tuesday",
    category: "Weight Gain",
    hook:     "Skinny and tired of it? Gain weight the clean way.",
    tip1:     "Eat calorie-dense whole foods — nuts, ghee, bananas.",
    tip2:     "Add a mass-gain smoothie between meals.",
    cta:      "Join FREE 7 PM Zoom Session Tonight →"
  },
  {
    day:      "Wednesday",
    category: "Immune Health",
    hook:     "Stop falling sick every season — fix it from the plate.",
    tip1:     "Eat turmeric, ginger, and amla daily.",
    tip2:     "70% of immunity lives in your gut.",
    cta:      "Join FREE 7 PM Zoom Session Tonight →"
  },
  {
    day:      "Thursday",
    category: "Digestive Health",
    hook:     "Tired of looking 4 months pregnant after meals?",
    tip1:     "Chew slowly — digestion starts in the mouth.",
    tip2:     "Avoid cold water with meals.",
    cta:      "Join FREE 7 PM Zoom Session Tonight →"
  },
  {
    day:      "Friday",
    category: "Healthy Lifestyle",
    hook:     "You don't need a new life — just these 5 small habits.",
    tip1:     "Start your morning with warm lemon water.",
    tip2:     "Walk 20 minutes after your biggest meal.",
    cta:      "Join FREE 7 PM Zoom Session Tonight →"
  },
  {
    day:      "Saturday",
    category: "LIVE Session",
    hook:     "Bring your toughest health question — going LIVE at 7 PM!",
    tip1:     "Ask anything: weight, skin, gut, energy.",
    tip2:     "Get a personalised plan — totally free.",
    cta:      "Join FREE 7 PM Zoom Session Tonight →"
  },
  {
    day:      "Sunday",
    category: "Community",
    hook:     "New week, new energy. Set your health intention with us.",
    tip1:     "Drop your ONE healthy goal for the week.",
    tip2:     "Small steps = big transformations.",
    cta:      "Join FREE 7 PM Zoom Session Tonight →"
  }
];

// ─────────────────────────────────────────────────────────────
//  BRAND COLOURS  (green / white palette)
// ─────────────────────────────────────────────────────────────
var COLOR = {
  bgDark:    [0.043, 0.149, 0.110],   // #0b2620  deep forest
  bgMid:     [0.055, 0.239, 0.180],   // #0e3d2e
  green:     [0.086, 0.639, 0.290],   // #16a34a  leaf green
  lime:      [0.518, 0.800, 0.086],   // #84cc16
  white:     [1,     1,     1    ],
  offwhite:  [0.941, 0.996, 0.976],   // #f0fdf4  mint
  badge_bg:  [0.129, 0.780, 0.365],   // #21c75d
};

// ─────────────────────────────────────────────────────────────
//  COMP SETTINGS
// ─────────────────────────────────────────────────────────────
var COMP_W      = 1080;
var COMP_H      = 1920;
var COMP_FPS    = 30;
var COMP_DUR    = 15;   // seconds

// ─────────────────────────────────────────────────────────────
//  HELPER  — ease a property with EaseIn/EaseOut
// ─────────────────────────────────────────────────────────────
function easeProp(prop, t1, v1, t2, v2) {
  prop.setValueAtTime(t1, v1);
  prop.setValueAtTime(t2, v2);
  var easeIn  = new KeyframeEase(0.5, 33);
  var easeOut = new KeyframeEase(0.5, 33);
  prop.setTemporalEaseAtKey(prop.nearestKeyIndex(t1), [easeIn],  [easeOut]);
  prop.setTemporalEaseAtKey(prop.nearestKeyIndex(t2), [easeIn],  [easeOut]);
}

// ─────────────────────────────────────────────────────────────
//  ADD A SOLID BACKGROUND LAYER
// ─────────────────────────────────────────────────────────────
function addBackground(comp) {
  var solid = comp.layers.addSolid(COLOR.bgDark, "Background", COMP_W, COMP_H, 1, COMP_DUR);
  solid.moveToEnd();
  return solid;
}

// ─────────────────────────────────────────────────────────────
//  ADD DECORATIVE BLOB (shape layer circle)
// ─────────────────────────────────────────────────────────────
function addBlob(comp, cx, cy, radius, color, delay) {
  var blob = comp.layers.addShape();
  blob.name = "Blob";
  blob.moveToEnd();

  var contents  = blob.property("Contents");
  var ellGrp    = contents.addProperty("ADBE Vector Group");
  ellGrp.name   = "Ellipse Group";
  var ellCont   = ellGrp.property("Contents");

  var ellipse   = ellCont.addProperty("ADBE Vector Shape - Ellipse");
  ellipse.property("Size").setValue([radius * 2, radius * 2]);
  ellipse.property("Position").setValue([cx - COMP_W / 2, cy - COMP_H / 2]);

  var fill      = ellGrp.property("Contents").addProperty("ADBE Vector Graphic - Fill");
  fill.property("Color").setValue(color);

  var xform     = ellGrp.property("Transform");
  xform.property("Opacity").setValue(40);

  // gentle float animation on the blob position
  var pos = xform.property("Position");
  pos.setValueAtTime(0,       [0, 0]);
  pos.setValueAtTime(delay + 5, [20, -30]);
  pos.setValueAtTime(delay + 10,[0, 0]);

  blob.blendingMode = BlendingMode.NORMAL;
  return blob;
}

// ─────────────────────────────────────────────────────────────
//  ADD A TEXT LAYER  with slide-up + fade-in animation
// ─────────────────────────────────────────────────────────────
function addAnimatedText(comp, text, font, size, color, x, y, startTime, endTime, isCenter) {
  var layer = comp.layers.addText(text);
  layer.name = text.substring(0, 30);

  var srcText = layer.property("Source Text");
  var doc     = srcText.value;
  doc.resetCharStyle();
  doc.font            = font;
  doc.fontSize        = size;
  doc.fillColor       = color;
  doc.justification   = isCenter ? ParagraphJustification.CENTER_JUSTIFY
                                 : ParagraphJustification.LEFT_JUSTIFY;
  doc.trackingType    = TrackingType.BEFORE_AND_AFTER;
  doc.tracking        = 20;
  srcText.setValue(doc);

  // Position
  layer.property("Transform").property("Position").setValue([COMP_W / 2 + x, y]);

  // Anchor point centred
  layer.property("Transform").property("Anchor Point").setValue([0, 0]);

  // Fade in
  var opac = layer.property("Transform").property("Opacity");
  easeProp(opac, startTime,        0, startTime + 0.6, 100);
  if (endTime < COMP_DUR) {
    easeProp(opac, endTime - 0.4, 100, endTime,          0);
  }

  // Slide up
  var pos  = layer.property("Transform").property("Position");
  var yVal = y;
  easeProp(pos, startTime, [COMP_W / 2 + x, yVal + 60],
                startTime + 0.6, [COMP_W / 2 + x, yVal]);

  layer.inPoint  = startTime;
  layer.outPoint = (endTime < COMP_DUR) ? endTime : COMP_DUR;

  return layer;
}

// ─────────────────────────────────────────────────────────────
//  BUILD ONE COMP FOR ONE DAY'S CONTENT
// ─────────────────────────────────────────────────────────────
function buildComp(data) {
  var compName = data.day + " — " + data.category;
  var comp = app.project.items.addComp(compName, COMP_W, COMP_H, 1, COMP_DUR, COMP_FPS);

  // 1. Background solid
  addBackground(comp);

  // 2. Decorative blobs
  addBlob(comp, 200,  300, 400, COLOR.green, 0);
  addBlob(comp, 900, 1600, 360, COLOR.lime,  2);
  addBlob(comp, 600,  950, 300, COLOR.bgMid, 1);

  // 3. Top badge — "FREE ZOOM · 7 PM DAILY"
  addAnimatedText(comp,
    "✦  FREE ZOOM SESSION  ·  7 PM DAILY  ✦",
    "Arial-BoldMT", 34, COLOR.badge_bg, 0, 200, 0.2, COMP_DUR, true);

  // 4. Day / Category label
  addAnimatedText(comp,
    data.day.toUpperCase() + "  ·  " + data.category.toUpperCase(),
    "Arial-BoldMT", 38, COLOR.lime, 0, 340, 0.5, COMP_DUR, true);

  // 5. Hook (big headline)
  addAnimatedText(comp,
    data.hook,
    "Georgia-Bold", 88, COLOR.white, 0, 700, 0.9, COMP_DUR, true);

  // 6. Tip 1  (bullet)
  addAnimatedText(comp,
    "→  " + data.tip1,
    "ArialMT", 54, COLOR.offwhite, -30, 1060, 1.5, COMP_DUR, false);

  // 7. Tip 2  (bullet)
  addAnimatedText(comp,
    "→  " + data.tip2,
    "ArialMT", 54, COLOR.offwhite, -30, 1160, 1.9, COMP_DUR, false);

  // 8. Divider line (thin solid)
  var divider = comp.layers.addSolid(COLOR.green, "Divider", COMP_W - 120, 3, 1, COMP_DUR);
  divider.property("Transform").property("Position").setValue([COMP_W / 2, 1290]);
  var divOpac = divider.property("Transform").property("Opacity");
  easeProp(divOpac, 2.2, 0, 2.8, 100);

  // 9. CTA
  addAnimatedText(comp,
    data.cta,
    "Arial-BoldMT", 52, COLOR.green, 0, 1420, 2.5, COMP_DUR, true);

  // 10. Branding footer
  addAnimatedText(comp,
    "🌱  Wellness Coach",
    "Arial-BoldMT", 44, COLOR.offwhite, 0, 1800, 3.0, COMP_DUR, true);

  return comp;
}

// ─────────────────────────────────────────────────────────────
//  MAIN — show dialog then generate
// ─────────────────────────────────────────────────────────────
function main() {
  var dlg = new Window("dialog", "Wellness Reel Generator");
  dlg.orientation = "column";
  dlg.alignChildren = "fill";
  dlg.margins = 20;

  dlg.add("statictext", undefined, "Wellness Coach — Reel Generator", {name:"title"});
  dlg.add("statictext", undefined, "Creates one 1080×1920 comp per post.");
  dlg.add("separator");

  var modeGrp  = dlg.add("panel", undefined, "Generate");
  modeGrp.orientation = "column";
  modeGrp.alignChildren = "left";
  var radioAll = modeGrp.add("radiobutton", undefined, "All 7 days at once");
  var radioOne = modeGrp.add("radiobutton", undefined, "Pick one day:");
  radioAll.value = true;

  var dayDropdown = modeGrp.add("dropdownlist", undefined,
    ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]);
  dayDropdown.selection = 0;

  radioOne.onClick = function() { dayDropdown.enabled = true;  };
  radioAll.onClick = function() { dayDropdown.enabled = false; };
  dayDropdown.enabled = false;

  var btnGrp = dlg.add("group");
  btnGrp.alignment = "center";
  var btnGen  = btnGrp.add("button", undefined, "Generate Reels ✨");
  var btnCancel = btnGrp.add("button", undefined, "Cancel");

  btnCancel.onClick = function() { dlg.close(); };

  btnGen.onClick = function() {
    dlg.close();
    app.beginUndoGroup("Wellness Reel Generator");

    if (radioAll.value) {
      for (var i = 0; i < CONTENT.length; i++) {
        buildComp(CONTENT[i]);
      }
      alert("Done! Created " + CONTENT.length + " comps.\n\nFind them in your Project panel.\nRender via File → Export → Add to Media Encoder Queue.");
    } else {
      var idx = dayDropdown.selection.index;
      buildComp(CONTENT[idx]);
      alert("Done! Comp \"" + CONTENT[idx].day + "\" created.\nFind it in your Project panel.");
    }

    app.endUndoGroup();
  };

  dlg.show();
}

main();

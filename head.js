async function about() {
  var appInfo = document.title + "\nBased on " + app.info;
  // Disable esc_on_exit which may interfer with esc on alert
  document.removeEventListener("keyup", exit_on_esc);
  await gui.msgbox(appInfo);
  // Re-enable esc_on_exit
  await new Promise(r => setTimeout(r, 400));
  document.addEventListener("keyup", exit_on_esc);
}

function decodeHtml(html) {
  var txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

function basename(path) {
  return path.split(/[\\/]/).pop();
}


// *fs.write: at least 1 parameter, truncate and write to the file who's name is provided as the first parameter, the content of all the following parameters, return true if the operation was OK, else false.
async function save_file() {
  await fs.write(filepath.value, file_text.innerText);
}

async function saveas_file() {
  var file = (await gui.savedlg());
  if (file.length > 0) await fs.write(file, file_text.innerText);
}

async function read_file(filename) {
  filename = decodeHtml(filename);
  //console.log("read_file: [" + filename + ']');

  if (filename.length > 0) {
    // This test does not arm but seems to be unuseful under Windows and GTK
    if (await fs.exists(filename)) {
      app.set_title(document.title + " - " + basename(filename));
      filepath.value = filename;
      var subText = await fs.read(filename);
      subText.parseSubtitles();
    } else {
      gui.msgbox(`File [${filename}] does not exists.`);
    }
  }
}

async function reload_file() {
  var oldSubText = file_text.innerText;
  var newSubText = await fs.read(filepath.value);

  if (newSubText != oldSubText && (await gui.msgbox("Your actual modifications will be lost, is that OK ?", 2))) {
    newSubText.parseSubtitles();
  }
}

var oldText = "";
var planTextUpdate = false;

async function open_file() {
  read_file(await gui.opendlg());
}

var current_line_number;

function getElements() {
  //console.log(`typeof current_line_number: ${typeof current_line_number}`);

  if (typeof current_line_number === "undefined") {
    current_line_number = document.getElementById("current_line_number");
    //console.log(`current_line_number: ${current_line_number.value}`);
  }
}

var inc = 0; // Used to juxtapose multiple instance of SubAdjust
var subs; // Contains the structured result of a parsed subtitle
if (typeof app.sysname !== "undefined") {
  /*
  for (const key of Object.keys(localStorage))
    console.log(key+": "+localStorage.getItem(key));
  localStorage.clear();
  */

  app.set_icon("app.ico");

  function clean_exit() {
    console.log("clean_exit");
    localStorage.setItem(document.title + "_incr", "0");
    bc.close();
    app.exit();
  }

  var max_width = 0,
    max_height = 0;
  (async () => {
    // Get the max width and height of the working area
    mons = await win.monitors_info();
    //console.log(`Monitors: ${JSON.stringify(mons)}`);
    for (const [key, mon] of Object.entries(mons)) {
      //console.log(`${key}: ${JSON.stringify(mon)}`);
      working_area = mon['working area'];
      //console.log(`${key}[working area]: ${JSON.stringify(working_area)}`);
      if (working_area[2] > max_width)
        max_width = working_area[2];
      if (working_area[3] > max_height)
        max_height = working_area[3];
    }
    //console.log(`max_width=${max_width}, max_height=${max_height}`);
  })();


  // To try to juxtapose multiple subadjust instances
  var bc = new BroadcastChannel(document.title);

  bc.onmessage = (event) => {
    inc++;
    //new_title=app.title.replace(/\d* - /, inc+" - ");
    //app.set_title(new_title);
    var newX = app.x - (app.w - (app.left_border + app.right_border));
    if (newX < 0) newX = 0;
    //console.log(`new X: ${newX}`);
    app.set_pos(newX, app.y);
  }

  if (inc === 0) {
    // Tell the other pages I'm here
    bc.postMessage('run_increment');
  }

  var args = app.args_line.split(',');
  //for (var i = 0; i < args.length; i++) { console.log(`args[${i}]=${args[i]}`); }

  function setCaret(elt) {
    var nl = elt.target.value;
    const range = document.createRange();
    const selection = window.getSelection();

    if (nl < subs.line_number) {
      range.setStart(file_text.childNodes[nl], 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else elt.target.value = subs.line_number;
  }

  async function do_load() {
    getElements();
    document.addEventListener("keyup", exit_on_esc);
    await app.set_size(430, 600, 1);
    if (app.x < 0) correcX = 0;
    else if (app.x > max_width) correcX = max_width;
    else correcX = app.x;
    if (app.y < 0) correcY = 0
    else if (app.y > max_height) correcX = max_height;
    else correcY = app.y;
    app.set_pos(correcX, correcY);
    await app.show();

    if (args.length >= 2) {
      read_file(args[1]);
    }

    start_time.addEventListener("change", (e) => {
      coeffAdjust();
    });

    end_time.addEventListener("change", (e) => {
      //console.log(e);
      coeffAdjust();
    });

    offset.addEventListener("change", (e) => {
      //console.log(e.srcElement.value);
      //console.log(e);
      timeAdjust();
    });

    factor.addEventListener("change", (e) => {
      //console.log(e);
      timeAdjust();
    });

    current_line_number.addEventListener("input", (e) => {
      const lh = parseInt(window.getComputedStyle(file_container, null).getPropertyValue("line-height"));
      //console.log(`e.target.value: ${e.target.value}, lh: ${lh}, file_container.scrollTop: ${(e.target.value - 1) * lh}`);
      file_container.scrollTop = (e.target.value - 1) * lh;
      setCaret(e);
      e.target.focus();
    });

    current_line_number.addEventListener("focusout", (e) => {
      setCaret(e);
    });

    toTop.addEventListener("click", (e) => {
      getElements();
      file_container.scrollTop = 0;
      current_line_number.value = "1";
    });

    toMiddleLine.addEventListener("click", () => {
      getElements();
      const lh = parseInt(window.getComputedStyle(file_container, null).getPropertyValue("line-height"));
      const ln = parseInt((file_container.scrollHeight / 2)) - lh;
      file_container.scrollTop = ln;
      //console.log(`Middle line number: ${parseInt(ln / lh)+1}, file_container.scrollHeight: ${file_container.scrollHeight}, file_container.scrollTop = ${ln}`);
      current_line_number.value = 1 + parseInt(ln / lh);
    });

    toMiddleSub.addEventListener("click", () => {
      getElements();
      var subn = parseInt(subs.sub_number / 2);
      const re = new RegExp('\n' + subn + '\n');
      var pos = file_text.innerText.search(re);

      if (pos != -1) {
        var ln = 1 + parseInt(file_text.innerText.substring(0, pos).count_lines());
        const lh = parseInt(window.getComputedStyle(file_container, null).getPropertyValue("line-height"));
        //console.log(`Midlle sub number: ${subn}, character pos: ${pos}, line number: ${ln}, lh: ${lh}`);
        file_container.scrollTop = ln * lh;
        //console.log(`current_line_number.value: ${current_line_number}, changing to ${(ln).toString()}`);
        current_line_number.value = ln + 1;
      }
    });

    toMiddleTime.addEventListener("click", () => {
      getElements();
      var closest_tc;
      var closest_ms = tc_to_ms(subs.last_appearance_tc);
      var mid_ms = (closest_ms + tc_to_ms(subs.first_appearance_tc)) / 2;
      var closest_line = 0,
        nlines = 0;
      console.log(`AVT mid_ms: ${mid_ms}`);

      for (sub of subs.subtitles) {
        var curr_ms = tc_to_ms(sub.appearance_tc);
        var diff_ms = mid_ms - curr_ms;
        if (diff_ms < 0) break;

        if (closest_ms > diff_ms) {
          closest_ms = curr_ms;
          closest_tc = sub.appearance_tc;
          closest_line = nlines;
        }

        nlines += (4 + sub.text.count_lines());
      }

      const lh = parseInt(window.getComputedStyle(file_container, null).getPropertyValue("line-height"));
      file_container.scrollTop = (closest_line + 1) * lh;
      current_line_number.value = closest_line + 2;

      console.log(`APR closest_tc: ${closest_tc}, closest_ms: ${closest_ms}, closest_line: ${closest_line}`);
      console.log("");
    });

    toBottom.addEventListener("click", () => {
      getElements();
      file_container.scrollTop = file_container.scrollHeight;
      current_line_number.value = subs.line_number;
    });

    file_text.addEventListener("focusin", () => {
      //console.log("May plan to update subs.");
      oldText = file_text.innerText;
    });

    file_text.addEventListener("focusout", () => {
      if (planTextUpdate && oldText !== file_text.innerText) {
        console.log("Effective subs updating.");
        file_text.innerText.parseSubtitles();
      } else {
        //console.log("Not necessary to update subs.");
      }

      planTextUpdate = false;
      oldText = "";
    });

    file_text.addEventListener("input", () => {
      //console.log("Plan to update subs.");
      planTextUpdate = true;
    });
  }

  window.addEventListener("load", do_load);
}

function exit_on_esc() {
  if (typeof app.sysname !== "undefined") {
    if (event.keyCode === 27) clean_exit();
  }
}

// Return a time code in the form hh:mm:ss,sss or hh:mm:ss.sss in milliseconds
function tc_to_ms(tc) {
  // 
  tc = tc.replace(/,/, ".");
  const re = /(\d+):(\d+):(\d+)\.(\d+)/;
  var m = tc.match(re);

  let ms = 0;
  if (m.length >= 2) ms = parseInt(m[1]) * 3600;
  if (m.length >= 3) ms += parseInt(m[2]) * 60;
  if (m.length >= 4) ms += parseInt(m[3]);
  ms *= 1000;
  if (m.length >= 5) ms += parseInt(m[4]);
  return ms;
}

/* Replaced by new Date(ms).toISOString().slice(11, 23)
 * Millisecond to time code correct for integer number up to 100 hours (3 600 000 000)
function ms_to_tc(ms) {
  // Pad number with 0 to obtain a string of 9 characters long
  var s = ms.toString();
  if (s.length < 9)
    s = ms.toString().padStart(9, '0')

  console.log(s);
  const re = /(\d\d)(\d\d)(\d\d)(\d\d\d)/;
  var m = s.match(re);
  //console.log(m[1]+':'+m[2]+':'+m[3]+','+m[4]);
  var tc = m[1] / 3600 + ':' + m[2] / 60 + ':' + m[3] + ',' + m[4];

  return tc;
}*/


String.prototype.count_char_occurrence = function(o = '\n') {
  return [...this].reduce((n, c) => c === o ? ++n : n, 0);
}

String.prototype.count_lines = function(c = '\n') {
  return this.count_char_occurrence();
}

String.prototype.remove_last_lines = function(n = 1) {
  var s = this;
  for (i = 0; i < n + 1; i++) {
    s = s.substring(0, s.lastIndexOf("\n"));
  }

  return s;
}

String.prototype.remove_last_empty_lines = function() {
  var s = this,
    l;
  var p;
  for (;;) {
    p = s.lastIndexOf("\n");
    if (p == -1) break;
    l = s.substring(p).trim();
    if (l.length === 0) {
      //console.log(`Removing [${l}] after pos ${p}`);
      s = s.substring(0, p);
    } else break;
  }

  return s;
}

// Analyze a string as subtitles in subrip format and return the corresponding json structured array
String.prototype.parseSubtitles = function() {
  var lineNumMaxWidth = this.count_lines().toString().length;

  const re = /^\s*(\d+:\d+:\d+,\d+)[^\S\n]+-->[^\S\n]+(\d+:\d+:\d+,\d+)((?:\n(?!\d+:\d+:\d+,\d+\b|\n+\d+$).*)*)/gm;
  var m = this.matchAll(re);

  let nsubs = 0,
    nlines = 1;
  var sub_arr = [];

  var correctSubText = "",
    correctSubLines = "";
  for (const sub of m) {
    //console.log("processing line "+nlines);
    if (sub.length === 4) {
      sub_arr.push({
        "appearance_tc": sub[1],
        "disappearance_tc": sub[2],
        "text": sub[3].trim("\n").trim("\r")
      });

      var nline = 3 + sub[3].count_lines();
      for (var n = nlines; n < nlines + nline; n++) {
        //correctSubLines += n.toString().padStart(lineNumMaxWidth, ' ') + '\n';
        correctSubLines += n + '\n';
      }
      nlines += nline;
      correctSubText += (nsubs + 1).toString() + '\n';
      correctSubText += sub[1] + " --> " + sub[2];
      correctSubText += sub[3] + '\n\n';
      nsubs++;
    } else console.log(`{ "error": "Issue with subtitle number ${nsubs} (line: ${line})" }`);
  }

  // Remove last 2 lines of correctSubLines
  //console.log("to_sub rem lines");
  correctSubText = correctSubText.remove_last_empty_lines();
  nlines = correctSubText.count_lines() + 1;

  file_lines.innerHTML = correctSubLines;
  file_lines.style.height = nlines.toString() + "em";
  //file_lines.style.width="2em";
  file_text.innerText = correctSubText;
  file_text.style.height = nlines.toString() + "em";
  fatc = sub_arr[0].appearance_tc;
  latc = sub_arr.at(-1).appearance_tc;
  ldtc = sub_arr.at(-1).disappearance_tc;
  ldms = tc_to_ms(ldtc);
  fams = tc_to_ms(fatc);
  dur_ms = ldms - fams;
  dur_tc = new Date(dur_ms).toISOString().slice(11, 23);
  //console.log(` ${ldtc}(${ldms})\n-${fatc}(${fams})\n-------------\n=${dur_tc}(${dur_ms})`);

  subs = {
    "first_appearance_tc": fatc,
    "last_appearance_tc": latc,
    "last_disappearance_tc": ldtc,
    "duration_tc": dur_tc,
    "sub_number": nsubs,
    "line_number": nlines,
    "subtitles": sub_arr
  };

  start_time.value = subs.first_appearance_tc.replace(/,/, '.');
  end_time.value = subs.last_appearance_tc.replace(/,/, '.');
  current_line_number = subs.nlines;

  coeffAdjust();

  console.log(subs);
  return subs;
};

// Compute the coefficients (offset and factor) from the times (start and end)
function coeffAdjust(from_time = true) {
  //console.log(`Start coeffAdjust - start_time:${start_time.value}, end_time:${end_time.value}, offset:${offset.value}, factor:${factor.value}`);
  var old_start_ms = tc_to_ms(subs.first_appearance_tc);
  var old_end_ms = tc_to_ms(subs.last_appearance_tc);
  var new_start_ms = tc_to_ms(start_time.value);
  var new_end_ms = tc_to_ms(end_time.value);
  offset.value = parseFloat((new_start_ms - old_start_ms) / 1000);
  var new_dur_ms = new_end_ms - new_start_ms;
  var old_dur_ms = old_end_ms - old_start_ms;
  factor.value = parseFloat(new_dur_ms / old_dur_ms);
  //console.log(`End - coeffAdjust - start_time:${start_time.value}, end_time:${end_time.value}, offset:${offset.value}, factor:${factor.value}`);
}

// Compute the times (start and end) from coefficients (offset and factor)
function timeAdjust() {
  var old_start_ms = tc_to_ms(start_time.value);
  var old_end_ms = tc_to_ms(end_time.value);
  var offs_ms = offset.value * 1000;
  //console.log(`Start timeAdjust - old_start_ms:${old_start_ms}, old_end_ms:${old_end_ms}, offset:${offs_ms}, factor:${factor.value}`);
  start_time.value = new Date(old_start_ms + offs_ms).toISOString().slice(11, 23);
  end_time.value = new Date(offs_ms + old_end_ms * factor.value).toISOString().slice(11, 23);
  //console.log(`End - timeAdjust - start_time:${start_time.value}, end_time:${end_time.value}, offset:${offset.value}, factor:${factor.value}`);
}

var adj_log = false;

function adj_tc(off, fac, old_tc, lab_tc = "") {
  let old_ms = tc_to_ms(old_tc);
  if (lab_tc.length > 0 && adj_log) console.log(`AVT ADJ ${lab_tc}, ${old_tc} (${old_ms})`);

  let new_ms = 1000 * off + old_ms * fac;
  let new_tc = new Date(new_ms).toISOString().slice(11, 23);
  if (lab_tc.length > 0 && adj_log) console.log(`APR ADJ ${lab_tc}, ${new_tc} (${new_ms})`);
  return new_tc;
}

function head_adj(off, fac, subs) {
  subs.first_appearance_tc = adj_tc(off, fac, subs.first_appearance_tc, "first_appearance_tc");
  subs.last_appearance_tc = adj_tc(off, fac, subs.last_appearance_tc, "last_appearance_tc");
  subs.last_disappearance_tc = adj_tc(off, fac, subs.last_disappearance_tc, "last_disappearance_tc");
  subs.duration_tc = adj_tc(off, fac, subs.duration_tc, "duration_tc");
}

function sub_adj(off, fac, sub) {
  sub.appearance_tc = adj_tc(off, fac, sub.appearance_tc, "sub.appearance_tc");
  sub.disappearance_tc = adj_tc(off, fac, sub.disappearance_tc, "sub.disappearance_tc");
}

function subAdjust() {
  for (i = 0; i < 3; i++) {
    coeffAdjust();
    //console.log(`offset: ${offset.value}, factor: ${factor.value}`);
    let offs = parseFloat(offset.value);
    let fact = parseFloat(factor.value);
    //console.log(`offs: ${offs}, fact: ${fact}`);

    head_adj(offs, fact, subs);

    var lines = "",
      texts = "";
    let nsubs = 1;
    let nlines = 0;
    for (var sub of subs.subtitles) {
      sub_adj(offs, fact, sub);
      //console.log(`${sub.appearance_tc} --> ${sub.disappearance_tc}`);
      lines += `${nsubs}`;
      texts += `${nsubs}\n`;
      texts += `${sub.appearance_tc} --> ${sub.disappearance_tc}\n`;
      texts += `${sub.text}\n\n`;
      nsubs++;
      var nline = 4 + sub.text.count_lines();
      for (var n = nlines; n < nlines + nline; n++) {
        lines += n + '\n';
      }
      nlines += nline;
    }

    //file_lines.innerHTML = lines;
    file_text.innerText = texts;

    subs.sub_number = nsubs - 1;
    subs.line_number = nlines - 1;
  }

  console.log(subs);
}

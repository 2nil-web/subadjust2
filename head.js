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

function encodeHtml(rawStr) {
  var encodedStr = rawStr.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
    return '&#' + i.charCodeAt(0) + ';';
  });
  return encodedStr;
}

function basename(path) {
  return path.split(/[\\/]/).pop();
}

async function write_file(filepath) {
  // Insure that dots in timestamp are all replaced by commas
  const re0 = /\n\d+:\d+:\d+.\d+[^\S\n]+-->[^\S\n]+\d+:\d+:\d+.\d+\n/g;
  no_dots = file_text.innerText.replaceAll(re0, function(match) {
    return match.replace(/\./g, ",");
  });

  await fs.write(filepath, no_dots);
  file_text.innerText=no_dots;
}

// *fs.write: at least 1 parameter, truncate and write to the file who's name is provided as the first parameter, the content of all the following parameters, return true if the operation was OK, else false.
async function save_file() {
  load_img.style.display="block";
  await write_file(filepath.value);
  load_img.style.display="none";
}

async function saveas_file() {
  var file = (await gui.savedlg());
  if (file.length > 0) await write_file(file);
}

async function read_file(filename) {
  filename = decodeHtml(filename);
  //console.log("read_file: [" + filename + ']');

  if (filename.length > 0) {
    // This test does not arm but seems to be unuseful under Windows and GTK
    if (await fs.exists(filename)) {
      app.set_title(document.title + " - " + basename(filename));
      filepath.value = filename;
      filepath.scrollLeft = filepath.scrollWidth;
      //console.log(`Opening ${filename}`);
      var subText = await fs.read_txt(filename);
      // Teste s'il y a un BOM et l'enléve

      //console.log(subText);
      subText.parseSubtitles();
    } else {
      gui.msgbox(`File [${filename}] does not exists.`);
    }
  }
}

function real_exit() {
  localStorage.setItem(document.title + "_incr", "0");
  bc.close();
  app.exit();
}

async function clean_exit() {
  //console.log("clean_exit");
  var actualSubText = file_text.innerText;
  var readSubText = await fs.read_txt(filepath.value);

  if (offset.value == "0" && factor.value == "1" && actualSubText == readSubText) real_exit();
  else {
    // Disable esc_on_exit which may interfer with esc on alert
    document.removeEventListener("keyup", exit_on_esc);
    var res=await gui.msgbox("Do you want to save your current changes to the file before leaving ?", 3);
    switch (res) {
     case "yes":
      await save_file();
      real_exit();
      break;
     case "no":
      //console.log("Not saving before exit: ");
      real_exit();
      break;
     case "cancel":
      //console.log("Aborting exit: ");
      break;
   }

    // Re-enable esc_on_exit
    await new Promise(r => setTimeout(r, 400));
    document.addEventListener("keyup", exit_on_esc);
 }
}

async function reload_file() {
  //console.log("reload_file");
  //console.log(`offset:${offset.value}, factor:${factor.value}`);
  var actualSubText = file_text.innerText;
  var reloadedSubText = await fs.read_txt(filepath.value);

  if (actualSubText != reloadedSubText && !(await gui.msgbox("Your actual modifications will be lost.\nDo you want to keep them ?", 2))) {
    reloadedSubText.parseSubtitles();
  }
}

var oldText = "";
var planTextUpdate = false;

async function open_file() {
  read_file(await gui.opendlg());
}

var current_line_number, current_sub_number;

function getElements() {
  if (typeof current_line_number === "undefined") {
    current_line_number = document.getElementById("current_line_number");
  }
  if (typeof current_sub_number === "undefined") {
      current_sub_number = document.getElementById("current_sub_number");
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
  var max_width = 0,
    max_height = 0;
  (async () => {
    //console.log(typeof win);
    if (typeof win !== "undefined") {
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
    } else {
      max_width = 1920;
      max_height = 1080;
    }
    //console.log(`max_width=${max_width}, max_height=${max_height}`);
    app.on_close("clean_exit()");
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
  async function sleep(nsec) {
    await new Promise(r => setTimeout(r, nsec * 1000));
  }

  function searchFromPos(str, re, from = 0) {
    const index = str.slice(from).search(re);
    return index === -1 ? -1 : index + from;
  }

  function getCharPosFromLineNumber(text, nl) {
    nl--;
    var currL=0;
    for (i=0; i < text.length; i++) {
      if (text[i] == '\n') currL++;
      if (currL == nl) return i;
    }
    return i;
  }

  function nextSub(n) {
    const cp=getCharPosFromLineNumber(file_text.innerText, n);
    var ns;
    if (cp > 0) ns=file_text.innerText.substring(cp).match(/\n\d+\n/);
    else ns=file_text.innerText.substring(cp).match(/\d+\n/);
    if (ns != null) return ns[0].trim();
    return subs.sub_number;
  }

  function goToLine(n) {
    if (n < 1 ) n=1;
    maxN=file_text.innerText.count_lines()+1;
    if (n > maxN) n=maxN;
    getElements();
    const lh = parseInt(window.getComputedStyle(file_container, null).getPropertyValue("line-height"));
    const scrollTop=(n - 1) * lh;
    file_container.scrollTop = scrollTop;
    current_line_number.value = n;
    current_sub_number.value = nextSub(n);
  }

  function goToSub(n) {
    if (n < 1 ) n=1;
    maxN=subs.sub_number;
    if (n > maxN) n=maxN;
    getElements();
    var subn = parseInt(n);
    var pos = 1;

    if (subn > 1) {
      const re = new RegExp('\n' + subn + '\n');
      pos = file_text.innerText.search(re);
    }

    if (pos != -1) {
      if (pos == 1) file_container.scrollTop = 1;
      else {
        var ln = 1 + parseInt(file_text.innerText.substring(0, pos).count_lines());
        const lh = parseInt(window.getComputedStyle(file_container, null).getPropertyValue("line-height"));
        file_container.scrollTop = lh*ln;
        current_line_number.value = ln + 1;
      }

      current_sub_number.value = subn;
    }
  }

  function goToTime(ms) {
      getElements();
      var closest_tc;
      var closest_ms = tc_to_ms(subs.last_appearance);
      var closest_line = 0, nlines = 0;
      console.log(`ms: ${ms}, closest_ms:${closest_ms}, subs.first_appearance:${subs.first_appearance}, subs.last_appearance:${subs.last_appearance}`);

      for (sub of subs.subtitles) {
        var curr_ms = tc_to_ms(sub.appearance);
        var diff_ms = ms - curr_ms;
        if (diff_ms < 0) break;

        if (closest_ms > diff_ms) {
          closest_ms = curr_ms;
          closest_tc = sub.appearance;
          closest_line = nlines;
        }

        nlines += (4 + sub.text.count_lines());
      }

      console.log(`closest_ms:${closest_ms}, closest_tc:${closest_tc}, closest_line:${closest_line}`);
      const lh = parseInt(window.getComputedStyle(file_container, null).getPropertyValue("line-height"));
      file_container.scrollTop = (closest_line + 1) * lh;
      current_line_number.value = closest_line + 2;
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

    current_line_number.addEventListener("input", (e) => { goToLine(e.target.value); setCaret(e); e.target.focus(); });
    current_line_number.addEventListener("focusout", (e) => { setCaret(e); });

    current_sub_number.addEventListener("input", (e) => { goToSub(e.target.value); setCaret(e); e.target.focus(); });
    current_sub_number.addEventListener("focusout", (e) => { setCaret(e); });

    toTop.addEventListener("click", () => { goToLine(1); });
    toMiddleLine.addEventListener("click", () => { goToLine(file_text.innerText.count_lines()/2); });

    toMiddleSub.addEventListener("click", () => { goToSub(subs.sub_number / 2); });

    toMiddleTime.addEventListener("click", () => { goToTime((tc_to_ms(subs.last_appearance) + tc_to_ms(subs.first_appearance)) / 2); });

    toBottom.addEventListener("click", () => {
      goToLine(file_text.innerText.count_lines()+2);
    });

    reRun.addEventListener("click", async () => {
      var sre1 = document.getElementById("reSrch").value;
      //console.log(`sre1: ${sre1}`);

      var re = sre1.match(/^\/(.*)\/(.*)/);
      var str, flg = "";

      if (re == null) {
        str = sre1;
      } else {
        str = re[1];
        flg = re[2];
      }

      //console.log(`str: ${str}`);
      //console.log(`flg: ${flg}`);
      var re1 = new RegExp(str, flg);
      var re2 = document.getElementById("reRepl").value;

      //console.log(`re1: ${re1}`);
      //console.log(`re2: ${re2}`);

      var orig = document.getElementById("file_text").innerText;
      var res = orig.replace(re1, re2);

      if (res != orig) {
        //console.log("RegExp modif OK");
        file_container.classList.add("blink_ok");
        document.getElementById("file_text").innerText = res;
        await sleep(2);
        file_container.classList.remove("blink_ok");
      } else {
        //console.log("RegExp modif KO");
        file_container.classList.add("blink_ko");
        await sleep(2);
        file_container.classList.remove("blink_ko");
        //gui.msgbox("No change");
      }
    });

    file_text.addEventListener("focusin", () => {
      //console.log("May plan to update subs.");
      oldText = file_text.innerText;
    });

    file_text.addEventListener("focusout", () => {
      if (planTextUpdate && oldText !== file_text.innerText) {
        //console.log("Effective subs updating.");
        //console.log("Call parseSubtitles from line 293");
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

    re_idx=0;
    function add_re_list (re_v, def=false) {
      var option = document.createElement('option');
      option.value = re_v;
      re_list.appendChild(option);
      if (def) reSrch.value=re_v;
    }

    //add_re_list("/{\\\\an8}/g", true);
  }

  window.addEventListener("load", do_load);
}

function exit_on_esc() {
  if (typeof app.sysname !== "undefined") {
    if (event.keyCode === 27) clean_exit();
  }
}

// Return a time code in the form hh:mm:ss,sss
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

String.prototype.count_lines = function() {
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

function re_empty(re) {
  var n = true;
  for (const r of re) {
    n = false;
    break;
  }

  return n;
}

String.prototype.srtMatchAll = function() {
  //const re = /^\s*(\d+:\d+:\d+.\d+)[^\S\n]+-->[^\S\n]+(\d+:\d+:\d+.\d+)((?:\n(?!\d+:\d+:\d+.\d+\b|\n+\d+$).*)*)/gm;
  //const re = /^\s*(\d\d:\d\d:\d\d.\d\d\d)[^\S\n]+-->[^\S\n]+(\d\d:\d\d:\d\d.\d\d\d)((?:\n(?!\d\d:\d\d:\d\d.\d\d\d\b|\n+\d+$).*)*)/gm;
  const re = /^\s*(\d\d:\d\d:\d\d.\d\d\d)[^\S\n]+-->[^\S\n]+(\d\d:\d\d:\d\d.\d\d\d) *(.*)((?:\n(?!\d\d:\d\d:\d\d.\d\d\d\b|\n+\d+$).*)*)/gm;
  return this.matchAll(re);
};

// Analyze a string as subtitles in subrip format and return the corresponding json structured array
String.prototype.parseSubtitles = function() {
  var m = this.srtMatchAll();

  let nsubs = 0,
    nlines = 1;
  var sub_arr = [];

  var correctSubText = "";
  for (const sub of m) {
    //console.log(`processing line ${nlines} for ${sub}`);
    var sub1;
    if (sub.length === 5) {
      sub[1] = sub[1].replace(/\./g, ",");
      sub[2] = sub[2].replace(/\./g, ",");
      sub[3] = sub[3].trim();
      sub[4] = sub[4].trim("\n").trim("\r");

      correctSubText += (nsubs + 1).toString() + '\n';
      correctSubText += sub[1] + " --> " + sub[2];
      sub1 = {
        "appearance": sub[1],
        "disappearance": sub[2],
        "text": sub[4]
      };

      if (sub[3].length > 0) {
        correctSubText += ' ' + sub[3];
        sub1.coordinate = sub[3];
      }
      sub_arr.push(sub1);

      correctSubText += '\n' + sub[4] + '\n\n';
      nsubs++;
    } //else console.log(`{ "error": "Issue with subtitle number ${nsubs} (line: ${line})" }`);
  }

  //console.log("to_sub rem lines");
  correctSubText = correctSubText.remove_last_empty_lines();
  nlines = correctSubText.count_lines() + 1;

  file_lines.innerHTML="";
  for (var il=1; il <= nlines; il++) {
    file_lines.innerHTML += il + '\n';
  }

  file_lines.style.height = nlines.toString() + "em";
  //file_lines.style.width="2em";
  file_text.innerText = correctSubText;
  file_text.style.height = nlines.toString() + "em";
  var fatc = "00:00:00,000",
    latc = "00:00:00,000",
    ldtc = "00:00:00,000",
    ldms = 0,
    fams = 0,
    dur_ms = 0,
    dur_tc = "00:00:00,000";

  if (sub_arr.length > 0) {
    fatc = sub_arr[0].appearance;
    latc = sub_arr.at(-1).appearance;
    ldtc = sub_arr.at(-1).disappearance;
    ldms = tc_to_ms(ldtc);
    fams = tc_to_ms(fatc);
    dur_ms = ldms - fams;
    dur_tc = new Date(dur_ms).toISOString().slice(11, 23);
  }

  subs = {
    "first_appearance": fatc,
    "last_appearance": latc,
    "last_disappearance": ldtc,
    "duration": dur_tc,
    "sub_number": nsubs,
    "line_number": nlines,
    "subtitles": sub_arr
  };

  start_time.value = subs.first_appearance.replace(/,/, '.');
  end_time.value = subs.last_appearance.replace(/,/, '.');
  current_line_number = subs.nlines;
  coeffAdjust();
  //console.log(subs);
  return subs;
};

// Adjust the coefficients (offset and factor) from the times (start and end)
function coeffAdjust() {
  //console.log(`Start coeffAdjust - start_time:${start_time.value}, end_time:${end_time.value}, offset:${offset.value}, factor:${factor.value}`);
  var old_start_ms = tc_to_ms(subs.first_appearance);
  var old_end_ms = tc_to_ms(subs.last_appearance);
  var new_start_ms = tc_to_ms(start_time.value);
  var new_end_ms = tc_to_ms(end_time.value);
  offset.value = parseFloat((new_start_ms - old_start_ms) / 1000);
  var new_dur_ms = new_end_ms - new_start_ms;
  var old_dur_ms = old_end_ms - old_start_ms;
  if (old_dur_ms !== 0) factor.value = parseFloat(new_dur_ms / old_dur_ms);
  else factor.value = 1;
  //console.log(`End - coeffAdjust - start_time:${start_time.value}, end_time:${end_time.value}, offset:${offset.value}, factor:${factor.value}`);
}

// Adjust the times (start and end) from coefficients (offset and factor)
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
  //if (lab_tc.length > 0 && adj_log) console.log(`AVT ADJ ${lab_tc}, ${old_tc} (${old_ms})`);

  let new_ms = 1000 * off + old_ms * fac;
  let new_tc = new Date(new_ms).toISOString().slice(11, 23);
  //if (lab_tc.length > 0 && adj_log) console.log(`APR ADJ ${lab_tc}, ${new_tc} (${new_ms})`);
  return new_tc;
}

function head_adj(off, fac, subs) {
  subs.first_appearance = adj_tc(off, fac, subs.first_appearance, "first_appearance");
  subs.last_appearance = adj_tc(off, fac, subs.last_appearance, "last_appearance");
  subs.last_disappearance = adj_tc(off, fac, subs.last_disappearance, "last_disappearance");
  subs.duration = adj_tc(off, fac, subs.duration, "duration");
}

function sub_adj(off, fac, sub) {
  sub.appearance = adj_tc(off, fac, sub.appearance, "sub.appearance");
  sub.disappearance = adj_tc(off, fac, sub.disappearance, "sub.disappearance");
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
      //console.log(`${sub.appearance} --> ${sub.disappearance}`);
      lines += `${nsubs}`;
      texts += `${nsubs}\n`;
      texts += `${sub.appearance} --> ${sub.disappearance}`;
      if (Object.hasOwn(sub, "coordinate")) texts += ' ' + sub.coordinate;
      texts += `\n${sub.text}\n\n`;
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
  //console.log(subs);
 }

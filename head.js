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

var inc = 0;
var subs;

async function load_subs(subText) {
  subs = subText.to_subtitles();
  start_time.value=subs.first_appearance_timecode.replace(/,/, '.');
  end_time.value=subs.last_appearance_timecode.replace(/,/, '.');
  console.log(subs);
}

async function read_file(filename) {
  filename = decodeHtml(filename);
  //console.log("read_file: [" + filename + ']');

  if (filename.length > 0) {
    // This test does not arm but seems to be unuseful under Windows and GTK
    if (await fs.exists(filename)) {
      app.set_title(document.title + " - " + basename(filename));
      filepath.value = filename;
      subText = await fs.read(filename);
      load_subs(subText);
    } else {
      gui.msgbox(`File [${filename}] does not exists.`);
    }
  }
}

async function reload_file() {
  var oldSubText = file_text.innerHTML;
  var newSubText=await fs.read(filepath.value);

  if (newSubText == oldSubText) return;

  if (await gui.msgbox("Your actual modifications will be lost, is that OK ?", 2)) {
    load_subs(newSubText);
  }
}

var oldText="";
var planTextUpdate=false;

async function open_file() {
  read_file(await gui.opendlg());
}

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

  async function do_load() {
    document.addEventListener("keyup", exit_on_esc);
    await app.set_size(464, 600, 1);
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

    toTop.addEventListener("click", () => {
      file_container.scrollTop=0;
    });

    toMiddleLine.addEventListener("click", () => {
      console.log(`BEFORE: scrollTop=${file_container.scrollTop}`);
      console.log(`scrollHeight=${file_container.scrollHeight}`);
      const lh= parseInt(window.getComputedStyle(file_container, null).getPropertyValue("line-height"));
      console.log(`lh=${lh}`);

      file_container.scrollTop=(file_container.scrollHeight/2)-lh;

      console.log(`AFTER: scrollTop=${file_container.scrollTop}`);
    });

    toMiddleSub.addEventListener("click", () => {
      console.log(`BEFORE: scrollTop=${file_container.scrollTop}`);
      console.log(`scrollHeight=${file_container.scrollHeight}`);
      const lh= parseInt(window.getComputedStyle(file_container, null).getPropertyValue("line-height"));
      console.log(`lh=${lh}`);

      file_container.scrollTop=(file_container.scrollHeight/2)-lh;

      console.log(`AFTER: scrollTop=${file_container.scrollTop}`);
    });

    toBottom.addEventListener("click", () => {
      const lh= parseInt(window.getComputedStyle(file_container, null).getPropertyValue("line-height"));
      file_container.scrollTop=(file_container.scrollHeight-20*lh);
    });

    file_text.addEventListener("focusin", () => {
      console.log("May plan to update subs.");
      oldText=file_text.innerText;
    });

    file_text.addEventListener("focusout", () => {
      if (planTextUpdate && oldText !== file_text.innerText) {
        console.log("Effective subs updating.");
        file_text.innerText.to_subtitles();
      } else {
        console.log("Not necessary to update subs.");
      }

      planTextUpdate=false;
      oldText="";
    });

    file_text.addEventListener("input", () => {
      console.log("Plan to update subs.");
      planTextUpdate=true;
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
function tc_to_ms(tc)
{
  const re2=/(\d+):(\d+):(\d+),(\d+)/;
  var m=tc.match(re2);
  var ms=0;
  if (m.length >= 2) ms=parseInt(m[1])*3600;
  if (m.length >= 3) ms+=parseInt(m[2])*60;
  if (m.length >= 4) ms+=parseInt(m[3]);
  ms*=1000;
  if (m.length >= 5) ms+=parseInt(m[4]);
  return ms;
}

// Millisecond to time code correct for integer number up to 100 hours (3 600 000 000)
function ms_to_tc(ms)
{
  // Pad number with 0 to obtain a string of 9 characters long
  var s=ms.toString();
  if (s.length < 9)
    s=ms.toString().padStart(9, '0')

  console.log(s);
  const re=/(\d\d)(\d\d)(\d\d)(\d\d\d)/;
  var m=s.match(re);
  //console.log(m[1]+':'+m[2]+':'+m[3]+','+m[4]);
  var tc=m[1]/3600+':'+m[2]/60+':'+m[3]+','+m[4];

  return tc;
}


String.prototype.count_char_occurrence = function(o='\n') {
  return [...this].reduce((n, c) => c === o ? ++n:n, 0);
}

String.prototype.count_lines = function(c='\n') {
  return this.count_char_occurrence();
}

String.prototype.remove_last_lines = function(n=1) {
  var s=this;
  for (i=0; i < n+1; i++) {
    s=s.substring(0, s.lastIndexOf("\n"));
  }

  return s;
}

// Analyze a string as subtitles in subrip format and return the corresponding json structured array
String.prototype.to_subtitles = function() {//return;
  var lineNumMaxWidth=this.count_lines().toString().length;

  const re = /^\s*(\d+:\d+:\d+,\d+)[^\S\n]+-->[^\S\n]+(\d+:\d+:\d+,\d+)((?:\n(?!\d+:\d+:\d+,\d+\b|\n+\d+$).*)*)/gm;
  var m = this.matchAll(re);

  let nsubs = 0, nlines=1;
  var sub_arr = [];

  var correctSubText="", correctSubLines="";
  for (const sub of m) {
    //console.log("processing line "+nlines);
    if (sub.length === 4) {
      var ams = tc_to_ms(sub[1]);
      var dms = tc_to_ms(sub[2]);
      sub_arr.push({
        "appearance_timecode": sub[1],
        "disappearance_timecode": sub[2],
        "appearance_ms": ams,
        "disappearance_ms": dms,
        "text": sub[3].trim("\n").trim("\r")
      });

      var nline=3+sub[3].count_lines();
      for (var n=nlines; n < nlines+nline; n++) {
        correctSubLines+=n.toString().padStart(lineNumMaxWidth, ' ')+'\n';
      }
      nlines+=nline;
      correctSubText+=(nsubs+1).toString()+'\n';
      correctSubText+=sub[1]+ " --> " + sub[2];
      correctSubText+=sub[3]+'\n\n';
      nsubs++;
    } else console.log(`{ "error": "Issue with subtitle number ${nsubs} (line: ${line})" }`);
  }

  // Remove last 2 lines of correctSubLines
  correctSubLines=correctSubLines.remove_last_lines(2);
  nlines-=3;

  file_lines.innerHTML=correctSubLines;
  file_lines.style.height=nlines.toString()+"em";
  //file_lines.style.width="2em";
  file_text.innerText=correctSubText;
  file_text.style.height=nlines.toString()+"em";
  fatc = sub_arr[0].appearance_timecode;
  latc = sub_arr.at(-1).appearance_timecode;
  ldtc = sub_arr.at(-1).disappearance_timecode;
  ldms=tc_to_ms(ldtc);
  fams=tc_to_ms(fatc);
  dur_ms=ldms-fams;
  dur_tc=new Date(dur_ms).toISOString().slice(11, 23);
  //console.log(` ${ldtc}(${ldms})\n-${fatc}(${fams})\n-------------\n=${dur_tc}(${dur_ms})`);

  var subs={
    "first_appearance_timecode": fatc,
    "last_appearance_timecode": latc,
    "last_disappearance_timecode": ldtc,
    "subs_duration_tc": dur_tc,
    "subs_duration_ms": dur_ms,
    "sub_number": nsubs,
    "line_number": nlines,
    "subtitles": sub_arr
  };

  return subs;
};

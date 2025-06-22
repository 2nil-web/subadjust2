async function about() {
  var appInfo = document.title + "\nBased on " + app.info;
  // Disable esc_on_exit which may interfer with esc on alert
  document.removeEventListener("keyup", exit_on_esc);
  await gui.msgbox(appInfo);
  // Re-enable esc_on_exit
  await new Promise(r => setTimeout(r, 400));
  document.addEventListener("keyup", exit_on_esc);
}
/*
var filename;
async function poll_file() {
  if (filename.length > 0) {
    if (await fs.exists(filename)) {
      file_content.style.border = "1px solid green";
    } else {
      file_content.style.border = "1px solid red";
    }
  } else {
    app.set_title(document.title);
  }
}
*/
function decodeHtml(html) {
  var txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

var file_content;


function basename(path) {
  return path.split(/[\\/]/).pop();
}

var inc = 0;
async function read_file(filename) {
  filename = decodeHtml(filename);
  //console.log("read_file: [" + filename + ']');

  if (filename.length > 0) {
    // This test does not arm but seems to be unuseful under Windows and GTK
    if (await fs.exists(filename)) {
      app.set_title(document.title + " - " + basename(filename));
      filepath.value = filename;
      file_content.innerText = await fs.read(filename);
    } else {
      gui.msgbox(`File [${filename}] does not exists.`);
    }
  }
}

async function load_file() {
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
    console.log(`new X: ${newX}`);
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
    await app.set_size(418, 600, 1);
    if (app.x < 0) correcX = 0;
    else if (app.x > max_width) correcX = max_width;
    else correcX = app.x;
    if (app.y < 0) correcY = 0
    else if (app.y > max_height) correcX = max_height;
    else correcY = app.y;
    app.set_pos(correcX, correcY);
    await app.show();
    file_content = document.getElementById("file_content");

    if (args.length >= 2) {
      read_file(args[1]);
    }
  }

  window.addEventListener("load", do_load);
}

function exit_on_esc() {
  if (typeof app.sysname !== "undefined") {
    if (event.keyCode === 27) clean_exit();
  }
}
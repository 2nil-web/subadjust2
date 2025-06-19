
function exit_on_esc() {
  if (event.keyCode === 27) app.exit();
}

async function about() {
  var appInfo = document.title+"\nBased on "+app.info;
  // Disable esc_on_exit which may interfer with esc on alert
  document.removeEventListener("keyup", exit_on_esc);
  await gui.msgbox(appInfo);
  // Re-enable esc_on_exit
  await new Promise(r => setTimeout(r, 400));
  document.addEventListener("keyup", exit_on_esc);
}

var filename;
async function poll_file() {
  if (filename.length > 0) {
    if (await fs.exists(filename)) {
      file_content.style.border="1px solid green";
    } else {
      file_content.style.border="1px solid red";
    }
  } else {
    app.set_title(document.title);
  }
}

function decodeHtml(html) {
    var txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

var file_content;

async function read_file(filename) {
  filename=decodeHtml(filename);
  console.log("read_file: " + filename);

  if (filename.length > 0) {
    // This test does not arm but seems to be unuseful under Windows and GTK
    if (await fs.exists(filename)) {
      app.set_title(document.title+" - "+filename);
      file_content.innerText=await fs.read(filename);
    } else {
      gui.msgbox(`File ${filename} does not exists.`);
    }
  }
}

async function load_file() {
  read_file(await gui.opendlg());
}

if (typeof app.sysname !== "undefined") {
  app.set_icon("app.ico");
  app.set_title(document.title);
  window.addEventListener("load", do_load);

  args=app.args_line.split(',');
  for (var i=0; i < args.length; i++) {
    console.log(`args[${i}]=${args[i]}`);
  }

  async function do_load() {
    document.addEventListener("keyup", exit_on_esc);
    await app.set_size(420,600, 1);
    await app.show();
    file_content=document.getElementById("file_content");

    if (args.length >= 2) {
      read_file(args[1]);
    }
  }
}


//        elt.vars.forEach((vl) => { });


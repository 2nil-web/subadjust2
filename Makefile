
MK_DIR=../33-webapp
SRC_DIR=.
PREFIX=Wallpaper-selector

SOURCES=app.svg config.js head.js index.html LICENSE style.css

include ${MK_DIR}/header.mk

all : app.png app.ico

${PREFIX}-${VERSION}-${SYS_VER}.zip : ${SOURCES}
	@rm -f $@
	cd ${MK_DIR} && make upx
	cp ${MK_DIR}/build/msvc/win/x64/Release/webapp.exe .
	zip -qj $@ app.ico app.png app.svg config.js head.js index.html LICENSE style.css webapp.exe

deliv : ${PREFIX}-${VERSION}-${SYS_VER}.zip
	@echo "Package $@ is ready to be dragged and dropped somewhere here https://github.com/2nil-web/Wallpaper-selector/releases/edit/$(shell git tag)"

format :
	@js-beautify -type html -s 2 -r *.html *.wsf
	@js-beautify -type css -s 2 -r *.css
	@js-beautify -type js -s 2 -r *.js

clean :
	rm -f app.ico app.png

include ${MK_DIR}/rules.mk


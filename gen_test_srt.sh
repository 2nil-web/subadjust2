#!/bin/bash

gen_utf () {
  cat <<EOF
1
00:01:01,111 --> 00:02:02.222
ما فوق الضريح

2
00:03:03,333 --> 00:04:04.444
یک تصادف ساده

3
00:05:05,555 --> 00:06:06.666
गुड न्यूज़

4
00:07:07,777 --> 00:08:08.888
പ്രഭയായ് നിനച്ചതെല്ലാം

5
00:09:09,999 --> 00:10:10.123
怪物

6
00:11:11,345 --> 00:12:12.678
Accentué èàû
EOF
}

gen_accent () {
  cat <<EOF
1
00:11:11,345 --> 00:12:12.678
Accentué

2
00:13:13,123 --> 00:14:14.456
txt è
EOF
}

echo "Generating UTF with good timestamp srt"
gen_utf >"1.UTF with good timestamp.srt"

echo "Generating UTF with bad timestamp srt"
gen_utf | sed 's/\(:\d\d\),/\1./' >"2.UTF with bad timestamp.srt"

echo "Generating ISO with good timestamp srt"
gen_accent | iconv -f UTF-8 -t ISO-8859-1 >"3.ISO with good timestamp.srt"

echo "Generating ISO with bad timestamp srt"
gen_accent | iconv -f UTF-8 -t ISO-8859-1 | sed 's/\(:\d\d\),/\1./' >"4.ISO with bad timestamp.srt"

echo "Generating Non ISO extended ASCII without NEL but with good timestamp srt"
gen_accent | iconv -f UTF-8 -t CP850 | sed "s/\x85//" >"5.Non ISO extended ASCII with good timestamp.srt"

echo "Generating Non ISO without NEL but with bad timestamp srt"
gen_accent | iconv -f UTF-8 -t CP437//TRANSLIT | sed 's/\x85//;s/\(:\d\d\),/\1./' >"6.Non ISO extended ASCII with bad timestamp.srt"

unix2dos -q ?.*.srt
file ?.*.srt

#!/usr/bin/env bash
# One-shot: rebuild the silent reel from demo_clips/*.webm (recomputing the
# AI-clip trim points from their durations), then mix the voice tracks into
# demo_clips/vetserve_demo_final.mp4. Audio placement matches the verified cut.
set -euo pipefail
cd "$(dirname "$0")/../demo_clips"
FF="../web/node_modules/ffmpeg-static/ffmpeg.exe"

dur() { ("$FF" -i "$1" 2>&1 || true) | grep -oE "Duration: [0-9:.]+" | head -1 | \
  python -c "import sys; h,m,s=sys.stdin.read().split(' ')[1].split(':'); print(float(h)*3600+float(m)*60+float(s))"; }

D1=$(dur vetguide_answer.webm)   # answer + hovers occupy the last 12.5s
D2=$(dur refusal.webm)           # refusal on screen for the last 5.3s
T1=$(python -c "print(max(0, $D1-12.5))")
T2=$(python -c "print(max(0, $D2-5.3))")
echo "vetguide_answer tail from $T1 / refusal tail from $T2"

"$FF" -y \
 -i landing.webm -i vetguide_answer.webm -i vetguide_answer.webm -i refusal.webm -i refusal.webm \
 -i crisis.webm -i post_task.webm -i claim.webm -i accept.webm -i address_done.webm \
 -i confirm.webm -i hours_pdf.webm -i verify.webm -i landing.webm \
 -filter_complex "\
[0:v]trim=0:16,setpts=PTS-STARTPTS,fps=25[s0];\
[1:v]trim=0:6.5,setpts=PTS-STARTPTS,fps=25[s1];\
[2:v]trim=$T1:$D1,setpts=PTS-STARTPTS,fps=25[s2];\
[3:v]trim=0:7,setpts=PTS-STARTPTS,fps=25[s3];\
[4:v]trim=$T2:$D2,setpts=PTS-STARTPTS,fps=25[s4];\
[5:v]setpts=PTS-STARTPTS,fps=25[s5];[6:v]setpts=PTS-STARTPTS,fps=25[s6];\
[7:v]setpts=PTS-STARTPTS,fps=25[s7];[8:v]setpts=PTS-STARTPTS,fps=25[s8];\
[9:v]setpts=PTS-STARTPTS,fps=25[s9];[10:v]setpts=PTS-STARTPTS,fps=25[s10];\
[11:v]setpts=PTS-STARTPTS,fps=25[s11];[12:v]setpts=PTS-STARTPTS,fps=25[s12];\
[13:v]trim=0:10,setpts=PTS-STARTPTS,fps=25[s13];\
[s0][s1][s2][s3][s4][s5][s6][s7][s8][s9][s10][s11][s12][s13]concat=n=14:v=1:a=0,format=yuv420p[out]" \
 -map "[out]" -c:v libx264 -crf 20 -preset fast vetserve_demo_silent.mp4 2>/dev/null
echo "silent reel rebuilt: $(dur vetserve_demo_silent.mp4)s"

"$FF" -y \
 -i "C:\Users\sharv\Downloads\IMG_7094.mov" \
 -i "C:\Users\sharv\Downloads\IMG_4453.mov" \
 -i vetserve_demo_silent.mp4 \
 -i landing.webm \
 -i "C:\Users\sharv\OneDrive\Documents\Sound Recordings\Recording.m4a" \
 -i "C:\Users\sharv\OneDrive\Documents\Sound Recordings\Recording (2).m4a" \
 -filter_complex "\
[0:v]trim=0.55:3.05,setpts=PTS-STARTPTS,zscale=t=linear:npl=100,tonemap=hable,zscale=p=bt709:t=bt709:m=bt709,scale=-2:800,pad=1280:800:415:0:color=0xF7F5F0,fps=25,setsar=1,format=yuv420p[va];\
[1:v]split=2[tb1][tb2];\
[tb1]trim=0.30:3.80,setpts=PTS-STARTPTS,scale=-2:800,pad=1280:800:415:0:color=0xF7F5F0,fps=25,setsar=1,format=yuv420p[vb];\
[tb2]trim=3.85:18.95,setpts=PTS-STARTPTS,scale=-2:800,pad=1280:800:415:0:color=0xF7F5F0,fps=25,setsar=1,format=yuv420p[ve];\
[2:v]trim=0:134.2,setpts=PTS-STARTPTS,fps=25,setsar=1,format=yuv420p[vc];\
[3:v]tpad=stop_mode=clone:stop_duration=3.0,fps=25,setsar=1,format=yuv420p[vd];\
[0:a]atrim=0.55:3.05,asetpts=PTS-STARTPTS,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[aa];\
[1:a]asplit=2[ta1][ta2];\
[ta1]atrim=0.30:3.80,asetpts=PTS-STARTPTS,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,adelay=2500:all=1[ab];\
[ta2]atrim=3.85:18.95,asetpts=PTS-STARTPTS,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,adelay=159200:all=1[ae];\
[4:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,adelay=5420:all=1[ac];\
[5:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,asplit=8[r1][r2][r3][r4][r5][r6][r7][r8];\
[r1]atrim=0:16.52,asetpts=PTS-STARTPTS,adelay=64500:all=1[p1];\
[r2]atrim=16.52:25.04,asetpts=PTS-STARTPTS,adelay=84500:all=1[p2];\
[r3]atrim=25.04:28.18,asetpts=PTS-STARTPTS,adelay=93700:all=1[p3];\
[r4]atrim=28.18:31.98,asetpts=PTS-STARTPTS,adelay=102600:all=1[p4];\
[r5]atrim=31.98:40.78,asetpts=PTS-STARTPTS,adelay=111100:all=1[p5];\
[r6]atrim=40.78:45.54,asetpts=PTS-STARTPTS,adelay=120400:all=1[p6];\
[r7]atrim=45.54:48.50,asetpts=PTS-STARTPTS,adelay=130500:all=1[p7];\
[r8]atrim=48.50:67.10,asetpts=PTS-STARTPTS,adelay=140500:all=1[p8];\
[va][vb][vc][vd][ve]concat=n=5:v=1:a=0[vfinal];\
[aa][ab][ac][p1][p2][p3][p4][p5][p6][p7][p8][ae]amix=inputs=12:normalize=0:dropout_transition=0,alimiter=limit=0.95[afinal]" \
 -map "[vfinal]" -map "[afinal]" -t 174.5 -c:v libx264 -crf 20 -preset fast -c:a aac -b:a 192k vetserve_demo_final_ga.mp4 2>/dev/null
echo "FINAL: $(dur vetserve_demo_final_ga.mp4)s -> demo_clips/vetserve_demo_final_ga.mp4"

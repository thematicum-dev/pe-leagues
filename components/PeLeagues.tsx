"use client";

import React, { useState, useMemo, useEffect, useContext } from "react";
import { Search, Briefcase, Trophy } from "lucide-react";

const TAB_ICON = { deals: Search, port: Briefcase, rank: Trophy };
const TAB_IDX = { deals: 0, port: 1, rank: 2 };

/* ============================================================
   PE-LEAGUES — MVP
   5er-Kohorte: Spieler + 4 KI-Fonds, 20 Halbjahre (10 Spieljahre)
   ============================================================ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

.pel { --paper:#F4F6F2; --card:#FFFFFF; --ink:#12201F; --ink2:#6B7B79;
  --rule:#E2E7DF; --ox:#B4443C; --teal:#1B7A6B; --gold:#B08430; --shade:#EDF1EA;
  --zebra:transparent; --panel:#12201F; --onpanel:#F4F6F2; --glow:rgba(18,32,31,.05);
  --r:10px;
  font-family:'Inter',system-ui,sans-serif; color:var(--ink); background:var(--paper);
  min-height:100%; -webkit-font-smoothing:antialiased; letter-spacing:-.005em;
  transition:background .25s ease,color .25s ease; }

.pel.dark { --paper:#0C1214; --card:#161F22; --ink:#EDF1EE; --ink2:#8E9C9B;
  --rule:#243033; --ox:#E3897F; --teal:#5FC4B1; --gold:#DCB264; --shade:#1C282B;
  --zebra:transparent; --panel:#080D0F; --onpanel:#EDF1EE; --glow:rgba(0,0,0,.4); }
.pel *{box-sizing:border-box;}
.pel .wrap{max-width:520px;margin:0 auto;padding-bottom:88px;}
.pel .disp{font-weight:600;letter-spacing:-.025em;line-height:1.15;}
.pel .mono{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums;}
.pel .eyebrow{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2);font-weight:600;}

.pel .bar{position:sticky;top:0;z-index:20;background:var(--panel);color:var(--onpanel);padding:11px 16px 0;
  box-shadow:0 2px 14px var(--glow);}
.pel .barrow{display:flex;justify-content:space-between;align-items:baseline;gap:10px;}
.pel .barrow > div{min-width:0;}
.pel .hint{font-size:11px;line-height:1.5;color:var(--ink2);margin:0;}
.pel .hint.ox{color:var(--ox);}
.pel .hint.teal{color:var(--teal);}
.pel .def{padding:15px 16px;border-top:1px solid var(--rule);}
.pel .def:first-child{border-top:0;padding-top:4px;}
.pel .dt{font-size:12.5px;font-weight:600;letter-spacing:-.01em;margin-bottom:5px;}
.pel .dd{font-size:13px;line-height:1.62;color:var(--ink2);}
.pel .dd b{color:var(--ink);font-weight:600;}
.pel .kpis{border-top:1px solid var(--rule);}
.pel .krow{display:flex;}
.pel .krow + .krow{border-top:1px solid var(--rule);}
.pel .krow > div{flex:1;min-width:0;padding:11px 8px;text-align:center;}
.pel .krow > div + div{border-left:1px solid var(--rule);}
.pel .kv{font-size:14px;font-weight:500;margin-top:5px;white-space:nowrap;}
.pel .deltas{display:flex;border-top:1px solid var(--rule);}
.pel .deltas > div{flex:1;padding:12px 10px;text-align:center;}
.pel .deltas > div + div{border-left:1px solid var(--rule);}
.pel .deltas .dv{font-size:15px;font-weight:500;margin-top:3px;}
.pel .hdot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:7px;vertical-align:1px;}
.pel .shelfmeta{font-size:11.5px;line-height:1.4;color:var(--ink2);margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pel .stat{font-size:9px;letter-spacing:.13em;text-transform:uppercase;opacity:.55;white-space:nowrap;}
.pel .statv{font-size:17px;font-weight:500;white-space:nowrap;margin-top:3px;}
.pel .prog{height:3px;background:rgba(255,255,255,.14);margin-top:12px;}

/* ---------- Coach: goldene Rahmen und Zielmarkierung ----------
   Der geführte Durchlauf braucht zwei Dinge sichtbar: was der Spieler jetzt tun
   soll, und wo er dafür tippen muss. Der Rahmen erklärt, die Markierung zeigt. */
.pel .coach{margin:12px 16px;border:1.5px solid var(--gold);border-radius:14px;
  background:color-mix(in srgb, var(--gold) 7%, transparent);padding:14px 15px;}
.pel .coach .ceyebrow{font-size:10px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--gold);font-weight:700;margin-bottom:5px;}
.pel .coach h4{margin:0 0 6px;font-size:15.5px;letter-spacing:-.01em;}
.pel .coach p{margin:0 0 8px;font-size:13px;line-height:1.55;color:var(--ink2);}
.pel .coach p:last-child{margin-bottom:0;}
.pel .coach .why{border-left:2px solid var(--gold);padding-left:10px;font-size:12.5px;}
.pel .coach dl{margin:8px 0 0;font-size:12.5px;line-height:1.5;}
.pel .coach dt{color:var(--gold);font-weight:650;}
.pel .coach dd{margin:0 0 7px;color:var(--ink2);}
.pel .spot{position:relative;outline:2px solid var(--gold)!important;outline-offset:3px;
  border-radius:12px;animation:pulse 1.8s ease-in-out infinite;}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb, var(--gold) 45%, transparent);}
  50%{box-shadow:0 0 0 7px color-mix(in srgb, var(--gold) 0%, transparent);}}
.pel .stepdots{display:flex;gap:5px;justify-content:center;margin:10px 0 0;}
.pel .stepdots i{width:6px;height:6px;border-radius:50%;background:var(--rule);}
.pel .stepdots i.on{background:var(--gold);}
.pel .stepdots i.done{background:color-mix(in srgb, var(--gold) 45%, transparent);}
.pel .prog i{display:block;height:100%;background:var(--gold);transition:width .4s ease;}
.pel .theme{background:transparent;border:1px solid rgba(255,255,255,.28);color:var(--onpanel);
  padding:3px 9px;font-size:14px;line-height:1;}
.pel .theme:hover{background:rgba(255,255,255,.12);color:var(--onpanel);}

.pel .card{background:var(--card);border:1px solid var(--rule);margin:14px 16px;
  border-radius:var(--r);box-shadow:0 1px 2px var(--glow);position:relative;overflow:hidden;}
.pel .card.st:before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:var(--sec);opacity:.85;}
.pel .secthead{display:flex;justify-content:space-between;align-items:baseline;
  padding:22px 2px 6px;border-top:1px solid var(--rule);margin:18px 16px 0;}
.pel .card.shelf{cursor:pointer;transition:border-color .15s ease;}
.pel .card.shelf:hover{border-color:var(--ink2);}
.pel .shelfrow{display:flex;gap:13px;align-items:center;padding:19px 16px;}
.pel .shelfmain{flex:1;min-width:0;}
.pel .shelfname{font-size:14px;font-weight:600;letter-spacing:-.015em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pel .shelfmoic{font-size:16px;font-weight:500;width:52px;text-align:right;flex:none;}
.pel .card.slot{border-style:dashed;background:transparent;box-shadow:none;}
.pel .hhead{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:16px 15px 0;}
.pel .flagpill{flex:none;font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;font-weight:600;
  border-radius:99px;color:var(--teal);background:color-mix(in srgb, var(--teal) 13%, transparent);
  padding:5px 10px;white-space:nowrap;}
.pel .flagpill.att{color:var(--ox);background:color-mix(in srgb, var(--ox) 13%, transparent);}
.pel .card.lm{border-color:var(--gold);box-shadow:0 0 22px -8px var(--gold),0 1px 0 var(--glow);}
.pel .card.lm:before{background:var(--gold);height:4px;}
.pel .card h3{margin:0;padding:18px 16px 10px;font-size:17px;}
.pel .pad{padding:0 16px 16px;}

/* Hauptreiz: die Kennzahlenzeile wie ein Kontenblatt */
.pel .ledger{width:100%;border-collapse:collapse;}
.pel .ledger td{padding:11px 16px;font-size:13px;line-height:1.4;border-bottom:1px solid var(--rule);}
.pel .ledger tr:last-child td{border-bottom:0;}
.pel .ledger td:last-child{text-align:right;font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;}
.pel .ledger td.lab{color:var(--ink2);white-space:nowrap;width:1%;padding-right:10px;}
.pel .lb .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

.pel .tag{display:inline-block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;
  padding:4px 9px;border-radius:99px;background:var(--shade);border:0;color:var(--ink2);margin:0 6px 6px 0;}
.pel .tag.prop{color:var(--gold);background:color-mix(in srgb, var(--gold) 12%, transparent);}
.pel .tag.flag{color:var(--ox);background:color-mix(in srgb, var(--ox) 12%, transparent);}
.pel .biz{font-size:12.5px;line-height:1.55;color:var(--ink2);margin:10px 0 0;
  padding-left:10px;border-left:2px solid var(--gold);}

.pel button{font-family:inherit;cursor:pointer;border:1px solid var(--rule);background:var(--card);
  color:var(--ink);padding:11px 16px;font-size:13px;font-weight:550;border-radius:8px;
  letter-spacing:-.01em;transition:background .15s,color .15s,border-color .15s;}
.pel button:hover:not(:disabled){background:var(--ink);color:var(--card);border-color:var(--ink);}
.pel button:disabled{opacity:.35;cursor:not-allowed;}
.pel button.solid{background:var(--ink);color:var(--paper);}
.pel button.solid:hover:not(:disabled){background:var(--teal);border-color:var(--teal);}
.pel button.ox{border-color:var(--ox);color:var(--ox);}
.pel button.ox:hover:not(:disabled){background:var(--ox);color:var(--card);}
.pel button:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}

.pel input[type=range]{width:100%;accent-color:#16262A;margin:6px 0 2px;}
.pel .slrow{display:flex;justify-content:space-between;font-size:12px;color:var(--ink2);}
.pel .slval{font-family:'JetBrains Mono',monospace;color:var(--ink);font-weight:500;}

.pel .tabs{position:fixed;bottom:0;left:0;right:0;display:flex;background:var(--panel);z-index:30;
  box-shadow:0 -2px 16px var(--glow);}
.pel .tabs button{flex:1;border:0;border-radius:0;color:rgba(228,234,227,.5);padding:12px 4px 14px;
  font-size:11px;letter-spacing:.1em;text-transform:uppercase;background:transparent;}
.pel .tabs button.on{color:var(--onpanel);box-shadow:inset 0 2px 0 var(--gold);}
.pel .tabs button:hover{background:rgba(255,255,255,.07);color:var(--onpanel);}

/* Signaturelement: Tombstone / Deal-Toy */
.pel .tomb{background:var(--panel);color:var(--onpanel);padding:20px 16px;text-align:center;margin:12px 16px;
  border:1px solid var(--panel);position:relative;box-shadow:0 3px 18px var(--glow);}
.pel .tomb:before{content:"";position:absolute;inset:5px;border:1px solid rgba(212,168,87,.5);pointer-events:none;}
.pel .tomb .amt{font-size:40px;font-weight:600;letter-spacing:-.035em;line-height:1;margin:8px 0 5px;}
.pel .tomb .sub{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);}

.pel .lb{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--rule);}
.pel .lb .rk{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--ink2);width:16px;}
.pel .lb .nm{flex:1;font-size:13px;}
.pel .lb .mo{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500;}
.pel .lb.me{background:rgba(169,134,60,.14);}

.pel .feed{font-size:12.5px;color:var(--ink2);padding:12px 16px;border-bottom:1px solid var(--rule);line-height:1.55;}
.pel .feed b{color:var(--ink);font-weight:600;}

.pel .modal{position:fixed;inset:0;background:rgba(22,38,42,.55);z-index:40;display:flex;
  align-items:flex-end;justify-content:center;padding:0;}
.pel .sheet{background:var(--paper);width:100%;max-width:520px;max-height:92vh;overflow:auto;
  border-radius:16px 16px 0 0;animation:up .22s ease-out;}
@keyframes up{from{transform:translateY(18px);opacity:.4}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){.pel .sheet{animation:none}}

.pel .att{display:flex;align-items:center;gap:10px;margin:10px 0;}
.pel .att .an{width:104px;font-size:13px;}
.pel .att .dots{display:flex;gap:4px;flex:1;}
.pel .dot{width:100%;height:16px;border:1px solid var(--rule);background:transparent;padding:0;}
.pel .dot.f{background:var(--ink);border-color:var(--ink);}

/* Meldungen der letzten Runde */
.pel .news{margin:12px 16px;border:1px solid var(--rule);background:var(--card);box-shadow:0 1px 0 var(--glow);}
.pel .news .nh{display:flex;justify-content:space-between;align-items:center;padding:14px 15px 10px;
  border-bottom:1px solid var(--rule);}
.pel .item{display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid var(--rule);
  font-size:13px;line-height:1.45;animation:slide .3s ease-out both;}
.pel .item:last-child{border-bottom:0;}
.pel .item .em{font-size:16px;line-height:1.3;flex-shrink:0;}
.pel .item.pos{border-left:3px solid var(--teal);}
.pel .item.neg{border-left:3px solid var(--ox);}
.pel .item.neu{border-left:3px solid var(--rule);}
.pel .item.tip{border-left:3px solid var(--gold);background:var(--zebra);}
.pel .item code{font-family:'JetBrains Mono',monospace;font-size:11.5px;}
.pel .item b{font-weight:600;}
.pel .quiet{padding:16px;font-size:13px;color:var(--ink2);}
@keyframes slide{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.pel .item{animation:none}}


/* Reifegrade People / Performance / Growth */
.pel .ppa{padding:14px 15px 10px;border-top:1px solid var(--rule);}
.pel .ppa .row{display:flex;align-items:center;gap:10px;margin-bottom:9px;}
.pel .ppa .lbl{width:74px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2);}
.pel .pips{display:flex;gap:3px;flex:1;}
.pel .pip{flex:1;height:7px;border-radius:99px;background:var(--rule);opacity:.6;}
.pel .pip.on{opacity:1;}
.pel .pip.p{background:var(--gold);} .pel .pip.l{background:var(--teal);} .pel .pip.a{background:#8478BE;}
.pel .pip.half{opacity:.55;}
.pel .ppa .st{font-size:10px;min-width:56px;text-align:right;color:var(--ink2);}
.pel .ppa .st.warn{color:var(--ox);} .pel .ppa .st.run{color:var(--gold);}

/* Positionsreihe */
.pel .seats{display:flex;gap:7px;padding:12px 15px 4px;}
.pel .seat{flex:1;border:1px solid var(--rule);border-radius:8px;padding:11px 6px;text-align:center;background:transparent;}
.pel .seat .rn{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2);}
.pel .seat .sk{font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:600;line-height:1.5;}
.pel .seat.vac{border-style:dashed;border-color:var(--ox);}
.pel .seat.vac .sk{color:var(--ox);}
.pel .seat.busy{border-color:var(--gold);}
.pel .seat:hover:not(:disabled){background:var(--zebra);}

.pel .sdot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;vertical-align:middle;}
.pel .lb .bar2{height:4px;background:var(--rule);width:52px;}
.pel .lb .bar2 i{display:block;height:100%;background:var(--gold);}

/* ============================================================
   TOUCH & FEEL — tactile response, momentum, anticipation
   ============================================================ */

/* Jede interaktive Fläche reagiert körperlich auf Berührung */
.pel button{transform:translateZ(0);transition:transform .12s cubic-bezier(.34,1.56,.64,1),
  background .15s ease,color .15s ease,box-shadow .15s ease,border-color .15s ease,opacity .15s ease;
  -webkit-tap-highlight-color:transparent;touch-action:manipulation;}
.pel button:active:not(:disabled){transform:scale(.94);}
.pel .seat, .pel .lb, .pel .dot{-webkit-tap-highlight-color:transparent;touch-action:manipulation;
  transition:transform .12s cubic-bezier(.34,1.56,.64,1),background .15s ease,border-color .15s ease;}
.pel .seat:active:not(:disabled){transform:scale(.95);}
.pel .lb[role="button"]:active{transform:scale(.985);}

/* Karten heben sich beim Erscheinen sanft aus dem Papier — kein Pop-in ohne Grund */
.pel .card, .pel .tomb, .pel .news{animation:rise .32s cubic-bezier(.22,.9,.34,1) both;}
.pel .card:nth-of-type(2){animation-delay:.03s;} .pel .card:nth-of-type(3){animation-delay:.06s;}
@keyframes rise{from{opacity:0;transform:translateY(10px) scale(.99);}to{opacity:1;transform:none;}}
@media (prefers-reduced-motion:reduce){.pel .card,.pel .tomb,.pel .news{animation:none;}}

/* Fortschrittsbalken: sichtbarer Puls statt totem Balken */
.pel .prog{position:relative;overflow:hidden;border-radius:2px;}

/* ---------- Coach: goldene Rahmen und Zielmarkierung ----------
   Der geführte Durchlauf braucht zwei Dinge sichtbar: was der Spieler jetzt tun
   soll, und wo er dafür tippen muss. Der Rahmen erklärt, die Markierung zeigt. */
.pel .coach{margin:12px 16px;border:1.5px solid var(--gold);border-radius:14px;
  background:color-mix(in srgb, var(--gold) 7%, transparent);padding:14px 15px;}
.pel .coach .ceyebrow{font-size:10px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--gold);font-weight:700;margin-bottom:5px;}
.pel .coach h4{margin:0 0 6px;font-size:15.5px;letter-spacing:-.01em;}
.pel .coach p{margin:0 0 8px;font-size:13px;line-height:1.55;color:var(--ink2);}
.pel .coach p:last-child{margin-bottom:0;}
.pel .coach .why{border-left:2px solid var(--gold);padding-left:10px;font-size:12.5px;}
.pel .coach dl{margin:8px 0 0;font-size:12.5px;line-height:1.5;}
.pel .coach dt{color:var(--gold);font-weight:650;}
.pel .coach dd{margin:0 0 7px;color:var(--ink2);}
.pel .spot{position:relative;outline:2px solid var(--gold)!important;outline-offset:3px;
  border-radius:12px;animation:pulse 1.8s ease-in-out infinite;}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb, var(--gold) 45%, transparent);}
  50%{box-shadow:0 0 0 7px color-mix(in srgb, var(--gold) 0%, transparent);}}
.pel .stepdots{display:flex;gap:5px;justify-content:center;margin:10px 0 0;}
.pel .stepdots i{width:6px;height:6px;border-radius:50%;background:var(--rule);}
.pel .stepdots i.on{background:var(--gold);}
.pel .stepdots i.done{background:color-mix(in srgb, var(--gold) 45%, transparent);}
.pel .prog i{position:relative;border-radius:2px;box-shadow:0 0 8px var(--gold);}
.pel .prog i:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);
  animation:shimmer 2.2s ease-in-out infinite;}
@keyframes shimmer{0%{transform:translateX(-100%);}100%{transform:translateX(100%);}}
@media (prefers-reduced-motion:reduce){.pel .prog i:after{animation:none;}}

/* Kennzahlen, die sich gerade verändert haben, blitzen kurz auf statt sich stillschweigend zu ändern */
.pel .flashpos{animation:flashPos .7s ease-out;}
.pel .flashneg{animation:flashNeg .7s ease-out;}
@keyframes flashPos{0%{color:var(--teal);text-shadow:0 0 12px rgba(31,95,91,.5);}100%{color:inherit;text-shadow:none;}}
@keyframes flashNeg{0%{color:var(--ox);text-shadow:0 0 12px rgba(122,46,46,.5);}100%{color:inherit;text-shadow:none;}}

/* Streak-Abzeichen: sichtbare Serie guter Halbjahre in Folge */
.pel .streak{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;color:var(--gold);
  animation:streakIn .3s cubic-bezier(.34,1.56,.64,1) both;}
@keyframes streakIn{from{opacity:0;transform:scale(.5) rotate(-8deg);}to{opacity:1;transform:none;}}

/* Positionskarten: neue/offene Angebote pulsieren dezent, um Aufmerksamkeit zu lenken */
.pel .pulse{animation:pulse 1.8s ease-in-out infinite;}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(169,134,60,.45);}50%{box-shadow:0 0 0 5px rgba(169,134,60,0);}}
@media (prefers-reduced-motion:reduce){.pel .pulse{animation:none;}}

/* Neu erschienene Deal-Karten heben sich einen Sekundenbruchteil ab */
.pel .fresh:before{content:"NEU";position:absolute;top:9px;right:-24px;background:var(--gold);color:var(--panel);
  font-size:9px;font-weight:700;letter-spacing:.1em;padding:2px 26px;transform:rotate(38deg);z-index:2;}

/* Haupt-CTA: deutlich griffiger, mit Tiefe statt flacher Fläche */
.pel button.solid{box-shadow:0 3px 0 rgba(0,0,0,.28),0 6px 16px -6px var(--glow);}
.pel button.solid:active:not(:disabled){box-shadow:0 1px 0 rgba(0,0,0,.28);transform:translateY(2px) scale(.985);}
.pel button.cta-big{position:relative;overflow:hidden;font-size:14.5px;letter-spacing:.02em;}
.pel button.cta-big:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);
  transform:translateX(-100%);}
.pel button.cta-big.ready:after{animation:ctaSheen 2.6s ease-in-out .4s infinite;}
@keyframes ctaSheen{0%,60%{transform:translateX(-100%);}100%{transform:translateX(100%);}}
@media (prefers-reduced-motion:reduce){.pel button.cta-big:after{animation:none;}}

/* Ladezustand: „Auktion läuft" — Spannung vor der Auflösung statt Sofortergebnis */
.pel .rollmask{position:fixed;inset:0;background:rgba(14,22,25,.82);backdrop-filter:blur(2px);z-index:50;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
  animation:fadeIn .18s ease-out both;}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
.pel .rollmask .rr{width:46px;height:46px;border:3px solid rgba(228,234,227,.18);border-top-color:var(--gold);
  border-radius:50%;animation:spin .8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.pel .rollmask .rt{color:var(--onpanel);font-size:17px;font-weight:600;letter-spacing:-.02em;}
.pel .rollmask .rs{color:rgba(228,234,227,.55);font-size:11px;letter-spacing:.14em;text-transform:uppercase;}

/* Toasts: kurze, körperliche Rückmeldung ohne den Feed zu unterbrechen */
.pel .toastwrap{position:fixed;top:66px;left:0;right:0;z-index:45;display:flex;flex-direction:column;
  align-items:center;gap:6px;pointer-events:none;}
.pel .toast{max-width:480px;width:calc(100% - 32px);background:var(--panel);color:var(--onpanel);
  border-left:3px solid var(--gold);padding:12px 15px;font-size:12.5px;box-shadow:0 8px 24px -8px rgba(0,0,0,.5);
  animation:toastIn .3s cubic-bezier(.22,.9,.34,1) both, toastOut .3s ease-in 2.4s both;}
.pel .toast.neg{border-left-color:var(--ox);}
.pel .toast.pos{border-left-color:var(--teal);}
@keyframes toastIn{from{opacity:0;transform:translateY(-10px) scale(.97);}to{opacity:1;transform:none;}}
@keyframes toastOut{to{opacity:0;transform:translateY(-6px) scale(.98);}}
@media (prefers-reduced-motion:reduce){.pel .toast{animation:none;}}

/* Konfetti: kurzer, körnig-analoger Freudenausbruch bei großen Erfolgen */
.pel .confetti{position:fixed;inset:0;z-index:60;pointer-events:none;overflow:hidden;}
.pel .confetti span{position:absolute;top:-10px;width:6px;height:10px;opacity:.9;
  animation:confFall 1.5s cubic-bezier(.35,0,.65,1) forwards;}
@keyframes confFall{to{transform:translateY(115vh) rotate(540deg);opacity:0;}}

/* Rangreihen: leichte Verschiebe-Rückmeldung */
.pel .lb{transition:background .2s ease;}

/* Neue Tableiste mit gleitendem Indikator statt statischem Zustand */
.pel .tabs{padding-top:2px;}
.pel .tabs .tabinner{position:relative;display:flex;flex:1;}
.pel .tabs .ind{position:absolute;top:0;left:0;height:2px;background:var(--gold);box-shadow:0 0 6px var(--gold);
  transition:transform .28s cubic-bezier(.65,0,.35,1);width:33.333%;}
.pel .tabs button{display:flex;flex-direction:column;align-items:center;gap:3px;position:relative;}
.pel .tabs button svg{width:17px;height:17px;transition:transform .2s cubic-bezier(.34,1.56,.64,1);}
.pel .tabs button.on svg{transform:translateY(-1px) scale(1.08);}
.pel .tabs button .badge{position:absolute;top:2px;margin-left:16px;background:var(--ox);color:#fff;
  font-size:9px;font-weight:700;min-width:14px;height:14px;border-radius:7px;display:flex;align-items:center;
  justify-content:center;padding:0 3px;box-shadow:0 0 0 2px var(--panel);}
`;

/* ---------------- Touch & Feel: kleine Helfer für spürbares Feedback ---------------- */

// Kurzes haptisches Feedback auf Geräten, die es unterstützen — no-op sonst
function haptic(pattern = 8) {
  try { if (navigator?.vibrate) navigator.vibrate(pattern); } catch (_) {}
}

// Zahlen springen nicht stumm um, sondern zählen sich sichtbar hoch/runter
function AnimatedNumber({ value, format, className, style }) {
  const [shown, setShown] = useState(value);
  const [flash, setFlash] = useState("");
  const prev = React.useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    if (from === to) return;
    setFlash(to > from ? "flashpos" : "flashneg");
    const dur = 420;
    const t0 = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else { setShown(to); prev.current = to; }
    };
    raf = requestAnimationFrame(step);
    const clr = setTimeout(() => setFlash(""), 700);
    return () => { cancelAnimationFrame(raf); clearTimeout(clr); };
  }, [value]);
  return <span className={(className || "") + (flash ? " " + flash : "")} style={style}>{format(shown)}</span>;
}

// Kurzer Konfettiausbruch bei großen Erfolgen — dezent limitiert, kein Dauerfeuer
function Confetti({ seed }) {
  const colors = ["#A9863C", "#1F5F5B", "#7A2E2E", "#8478BE", "#E9EDE4"];
  const pieces = useMemo(() => Array.from({ length: 26 }, (_, i) => ({
    id: i, l: 2 + rnd() * 96, delay: rnd() * .35, dur: 1.1 + rnd() * .6,
    c: colors[i % colors.length], rot: Math.round(rnd() * 360),
  })), [seed]);
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span key={p.id} style={{
          left: `${p.l}%`, background: p.c, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`,
          transform: `rotate(${p.rot}deg)`,
        }} />
      ))}
    </div>
  );
}

// Toasts: schnelle, unaufdringliche Rückmeldung parallel zum Meldungs-Feed
function Toasts({ items }) {
  if (!items.length) return null;
  return (
    <div className="toastwrap" aria-live="polite">
      {items.map((t) => (
        <div className={"toast " + (t.tone || "")} key={t.id}>
          <span dangerouslySetInnerHTML={{ __html: t.t }} />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Modell ---------------- */

const SECTORS = {
  Industrials: { g: 3.0, m: 8.5 },
  Healthcare:  { g: 5.0, m: 11.0 },
  Software:    { g: 8.0, m: 13.0 },
  Services:    { g: 3.5, m: 9.0 },
  Consumer:    { g: 2.0, m: 8.0 },
};
const SECNAMES = Object.keys(SECTORS);
// Nicht jede Flagge ist ein Risiko: die Buy-&-Build-Plattform ist die These,
// nicht der Preisdrücker. Wird deshalb getrennt ausgezeichnet.
const ANGLES = ["Buy-&-Build-Plattform"];
const isAngle = (fl) => ANGLES.indexOf(fl) >= 0;
// Anzeigenamen nach gängiger PE-Sektortaxonomie
const SECLABEL = {
  Industrials: "Industrials", Healthcare: "Healthcare", Software: "Software & IT Services",
  Services: "Business Services", Consumer: "Consumer & Retail",
};
const SECCOLOR = {
  Industrials: "#7C8B96", Healthcare: "#3E9B8F", Software: "#8478BE",
  Services: "#B4894C", Consumer: "#C4635C",
};

const P1 = ["Bren", "Aur", "Kalt", "Hoch", "Stein", "Wald", "Rhein", "Nord", "Vel", "Mark", "Trave", "Isar", "Ober", "Sal", "Ferr", "Lind", "Grün", "Alt"];
const P2 = ["ner", "avit", "mann", "burg", "feld", "tec", "mont", "sys", "werk", "thal", "stedt", "gau", "rath", "born", "eck", "hoff", "seil"];

/* Geschäftsmodell-Katalog: DACH-Mittelstandsarchetypen.
   m = EBITDA-Marge, g = Wachstum p.a., rb = Umsatzband, lev = Leverage-Kapazität,
   q = Qualitätsscore, fl = typische Risikoflaggen */
const BOOK = {
  Industrials: [
    { s: ["Dichtungstechnik", "Polymertechnik"], cx: 5, nw: 20, m: [11, 17], g: [0, 3], rb: [30, 120], lev: [3.2, 4.2], q: [35, 60], fl: ["Kundenkonzentration", "Margendruck"],
      d: "Hersteller von Präzisionsdichtungen für Hydraulik- und Pneumatikanwendungen. Serienfertigung an zwei deutschen Standorten, rund 60 % des Umsatzes mit Tier-1-Zulieferern der Nutzfahrzeugindustrie, Rest Bau- und Landmaschinen." },
    { s: ["Systemtechnik", "Anlagenbau"], cx: 3, nw: 30, m: [8, 13], g: [2, 6], rb: [45, 180], lev: [2.8, 3.6], q: [40, 65], fl: ["Nachfolgesituation", "Kundenkonzentration"],
      d: "Sondermaschinenbau für Verpackungslinien in der Lebensmittelindustrie. Projektgeschäft mit Vorauszahlungen, 25 % des Umsatzes aus Service und Ersatzteilen, Auftragsbestand von neun Monaten." },
    { s: ["Oberflächentechnik", "Galvanik"], cx: 9, nw: 10, m: [14, 20], g: [0, 2], rb: [25, 80], lev: [3.0, 3.8], q: [30, 50], fl: ["Investitionsstau", "Margendruck"],
      d: "Lohnbeschichter für Elektro- und Automobilzulieferer. Standortgebundenes Geschäft mit hoher Anlagenintensität und energiepreisabhängiger Kostenbasis, Kunden im Umkreis von 200 Kilometern." },
    { s: ["Brandschutz", "Lufttechnik"], cx: 4, nw: 20, m: [15, 22], g: [3, 7], rb: [40, 150], lev: [3.8, 5.0], q: [60, 85], fl: ["Buy-&-Build-Plattform"],
      d: "Hersteller von Brandschutzklappen und Lüftungskomponenten. Bauaufsichtliche Zulassungen als Eintrittsbarriere, Vertrieb über den technischen Großhandel, Nachfrage getrieben von Sanierungszyklen im Gewerbebau." },
    { s: ["Elektrotechnik", "Schaltanlagen"], cx: 3, nw: 25, m: [7, 11], g: [2, 5], rb: [35, 140], lev: [2.6, 3.4], q: [25, 45], fl: ["Margendruck", "Kundenkonzentration"],
      d: "Kabelkonfektionierung und Schaltschrankbau für Maschinenbauer. Lohnintensives Geschäft mit Fertigung in Deutschland und Tschechien, geringe Wechselkosten auf Kundenseite." },
    { s: ["Messtechnik", "Prüftechnik"], cx: 4, nw: 22, m: [17, 24], g: [3, 6], rb: [30, 110], lev: [4.0, 5.2], q: [65, 88], fl: ["Nachfolgesituation"],
      d: "Anbieter von Werkstoffprüfmaschinen mit rund 40 % Aftersales-Anteil. Installierte Basis von über 6.000 Geräten weltweit, Kalibrierung und Wartung binden Kunden über Jahrzehnte." },
    { s: ["Zerspanung", "Feinwerktechnik"], cx: 8, nw: 18, m: [13, 18], g: [4, 9], rb: [20, 70], lev: [3.0, 4.0], q: [50, 75], fl: ["Kundenkonzentration", "Investitionsstau"],
      d: "Zerspanungsdienstleister für Luftfahrt- und Medizintechnikkomponenten. Nadcap- und ISO-13485-zertifiziert, drei Kunden stehen für zwei Drittel des Umsatzes, langfristige Rahmenverträge." },
  ],
  Healthcare: [
    { s: ["Medical", "Surgical"], cx: 6, nw: 20, m: [18, 26], g: [4, 9], rb: [30, 120], lev: [4.0, 5.2], q: [60, 88], fl: ["Investitionsstau"],
      d: "Hersteller von Einmalinstrumenten für die minimalinvasive Chirurgie. MDR-Zulassung erneuert, Vertrieb über Klinikeinkaufsverbünde, Produktion mit eigener Reinraumfertigung." },
    { s: ["Dentaltechnik", "Dentallabore"], cx: 5, nw: 12, m: [14, 20], g: [3, 7], rb: [25, 90], lev: [3.6, 4.6], q: [45, 70], fl: ["Buy-&-Build-Plattform"],
      d: "Dentallabor-Gruppe mit zentraler CAD/CAM-Fertigung und angeschlossenen Regionallaboren. Wachstum über Zukäufe von Nachfolgekandidaten, Abrechnung über Zahnarztpraxen." },
    { s: ["Homecare", "Versorgung"], cx: 2, nw: 25, m: [11, 16], g: [4, 8], rb: [40, 160], lev: [3.4, 4.4], q: [40, 62], fl: ["Margendruck"],
      d: "Homecare-Versorger für Stoma-, Wund- und enterale Ernährungstherapie. Umsatz über Kassenverträge und Ausschreibungen, damit erlösseitig unmittelbar von Erstattungsentscheidungen abhängig." },
    { s: ["Orthopädie", "Orthetik"], cx: 4, nw: 22, m: [16, 22], g: [2, 6], rb: [25, 95], lev: [3.8, 4.8], q: [50, 75], fl: ["Kundenkonzentration"],
      d: "Hersteller orthopädischer Bandagen und Orthesen. Eigenmarke im Rezeptgeschäft plus OEM-Fertigung für zwei internationale Konzerne, Vertrieb über Sanitätshäuser." },
    { s: ["Clinical", "Research"], cx: 3, nw: 15, m: [13, 19], g: [7, 14], rb: [30, 130], lev: [3.2, 4.2], q: [55, 82], fl: ["Kundenkonzentration", "Nachfolgesituation"],
      d: "Auftragsforschungsinstitut für klinische Studien der Phasen II und III mit Schwerpunkt Onkologie. Auftragsbestand von 18 Monaten, Kunden sind mittelgroße Biotechs ohne eigene Studieninfrastruktur." },
    { s: ["Radiologie", "Diagnostik"], cx: 12, nw: 5, m: [20, 28], g: [3, 6], rb: [35, 140], lev: [4.2, 5.5], q: [55, 80], fl: ["Investitionsstau", "Buy-&-Build-Plattform"],
      d: "Betreiber radiologischer Versorgungszentren an sieben Standorten. Kassenzulassungen als Eintrittsbarriere, hoher Investitionsbedarf für MRT- und CT-Erneuerung im kommenden Zyklus." },
    { s: ["Cleanroom", "Reinraumtechnik"], cx: 5, nw: 18, m: [17, 23], g: [5, 10], rb: [20, 85], lev: [4.0, 5.0], q: [62, 86], fl: [],
      d: "Zulieferer von Reinraum-Verbrauchsmaterialien für die Pharma- und Biotechproduktion. Nahezu vollständig wiederkehrende Umsätze, qualifizierungspflichtige Produkte mit langen Requalifizierungszyklen." },
  ],
  Software: [
    { s: ["Software", "Systems"], cx: 2, nw: 5, m: [16, 24], g: [4, 9], rb: [15, 70], lev: [4.0, 5.2], q: [50, 75], fl: ["Investitionsstau"],
      d: "ERP-Speziallösung für Handwerks- und Baubetriebe. Rund 70 % Wartungserlöse aus der On-Premise-Basis, Migration der Bestandskunden in die eigene Cloud läuft seit zwei Jahren." },
    { s: ["Digital", "Cloud"], cx: 1.5, nw: -5, m: [18, 28], g: [12, 22], rb: [12, 55], lev: [4.2, 5.5], q: [65, 92], fl: [],
      d: "SaaS für Instandhaltungs- und Einsatzplanung bei Energieversorgern. Reines Abomodell mit Nettoumsatzretention von 108 %, durchschnittliche Vertragslaufzeit drei Jahre." },
    { s: ["Health IT", "Praxissysteme"], cx: 2, nw: 0, m: [22, 30], g: [3, 7], rb: [18, 75], lev: [4.4, 5.5], q: [60, 88], fl: ["Margendruck"],
      d: "Abrechnungs- und Praxisverwaltungssoftware für niedergelassene Ärzte. Hohe Wechselkosten und Marktanteil in der Nische, Produktzyklen von Regulierung und Telematikinfrastruktur getrieben." },
    { s: ["Retail Systems", "Warenwirtschaft"], cx: 2, nw: 5, m: [15, 22], g: [4, 8], rb: [20, 90], lev: [3.8, 4.8], q: [50, 72], fl: ["Kundenkonzentration"],
      d: "Warenwirtschaft für Apotheken mit angeschlossener Zahlungsabwicklung. Umsatzmix aus Lizenz, Wartung und Transaktionsgebühren, Nachfrage regulatorisch getrieben." },
    { s: ["Mobility", "Fleet"], cx: 2, nw: 0, m: [12, 20], g: [10, 18], rb: [10, 50], lev: [3.6, 4.6], q: [55, 80], fl: [],
      d: "Plattform für Fuhrpark- und Schadenmanagement. Erlös je Fahrzeug und Monat plus Provisionen aus Werkstattvermittlung, Wachstum über Flottenkunden ab 200 Fahrzeugen." },
    { s: ["IT Services", "Consulting"], cx: 1.5, nw: 18, m: [9, 14], g: [3, 8], rb: [30, 130], lev: [3.0, 3.8], q: [35, 55], fl: ["Margendruck", "Nachfolgesituation"],
      d: "IT-Dienstleister mit SAP-Beratung und Managed Services. Personalintensives Geschäft mit 45 % wiederkehrenden Umsätzen, Auslastung und Fluktuation sind die entscheidenden Stellgrößen." },
    { s: ["Bau Software", "Aufmaß"], cx: 2, nw: 8, m: [17, 25], g: [5, 10], rb: [12, 45], lev: [4.0, 5.0], q: [55, 78], fl: ["Investitionsstau"],
      d: "Software für Bauabrechnung, Aufmaß und Nachtragsmanagement. Umstellung vom Einmallizenz- auf das Abomodell begonnen, mobile Erfassung auf der Baustelle als Differenzierung." },
  ],
  Services: [
    { s: ["Gebäudetechnik", "Facility"], cx: 3, nw: 18, m: [10, 15], g: [3, 7], rb: [35, 150], lev: [3.4, 4.4], q: [45, 68], fl: ["Buy-&-Build-Plattform"],
      d: "Technischer Gebäudeservice für Heizung, Lüftung und Klima. Wartungsverträge mit Laufzeiten von drei bis fünf Jahren, regionale Verdichtung um vier Ballungsräume." },
    { s: ["Logistik", "Kontraktlogistik"], cx: 6, nw: 12, m: [6, 10], g: [4, 9], rb: [50, 200], lev: [2.6, 3.4], q: [25, 45], fl: ["Kundenkonzentration", "Margendruck"],
      d: "Kontraktlogistik für Retourenabwicklung im Onlinehandel. Volumengetriebenes Geschäft mit geringer Marge, zwei Großkunden stellen mehr als die Hälfte des Umsatzes." },
    { s: ["Prüfdienste", "Zertifizierung"], cx: 5, nw: 12, m: [18, 25], g: [4, 8], rb: [25, 95], lev: [4.0, 5.2], q: [60, 85], fl: [],
      d: "Akkreditierter Prüf- und Zertifizierungsdienstleister für Elektrogeräte und Maschinen. Wiederkehrende Prüfzyklen und normative Pflichten sichern planbare Auslastung." },
    { s: ["Personal", "Pflegedienste"], cx: 1, nw: 20, m: [7, 12], g: [5, 11], rb: [30, 120], lev: [2.8, 3.6], q: [25, 45], fl: ["Margendruck", "Kundenkonzentration"],
      d: "Personaldienstleister für Pflege- und Medizinberufe. Arbeitnehmerüberlassung mit tariflicher Bindung, Ergebnis hängt an der Rekrutierungsquote und an Einsatzstunden pro Mitarbeiter." },
    { s: ["Kalibrierung", "Servicetechnik"], cx: 5, nw: 12, m: [16, 22], g: [3, 6], rb: [15, 60], lev: [3.8, 4.8], q: [55, 78], fl: ["Nachfolgesituation"],
      d: "Kalibrierdienstleister für Industriemesstechnik. Gesetzlich vorgeschriebene Intervalle erzeugen wiederkehrende Aufträge, Kundenbindung über Gerätehistorie und Prüfmitteldatenbank." },
    { s: ["Waschanlagen", "Autoservice"], cx: 11, nw: 0, m: [22, 30], g: [2, 6], rb: [20, 80], lev: [4.2, 5.5], q: [40, 65], fl: ["Investitionsstau", "Buy-&-Build-Plattform"],
      d: "Betreiber von Portal- und Waschstraßenanlagen an 30 Standorten. Hohe Fixkostenbasis und Standortqualität als Werttreiber, Zukäufe einzelner Betreiber als Wachstumspfad." },
    { s: ["Ingenieurbüro", "Planung"], cx: 1.5, nw: 25, m: [11, 16], g: [2, 6], rb: [20, 75], lev: [3.0, 4.0], q: [40, 62], fl: ["Nachfolgesituation", "Kundenkonzentration"],
      d: "Ingenieurbüro für Tragwerksplanung und Bauüberwachung. Überwiegend öffentliche Auftraggeber mit HOAI-Vergütung, Schlüsselpersonenrisiko bei den drei Gesellschaftern." },
  ],
  Consumer: [
    { s: ["Petfood", "Tiernahrung"], cx: 5, nw: 20, m: [10, 15], g: [3, 8], rb: [40, 160], lev: [3.4, 4.4], q: [35, 58], fl: ["Kundenkonzentration", "Margendruck"],
      d: "Hersteller von Nass- und Trockenfutter als Handelsmarke für den Lebensmitteleinzelhandel. Rohstoffpreise werden mit Verzögerung weitergegeben, drei Handelsketten dominieren den Absatz." },
    { s: ["Outdoor", "Ausrüstung"], cx: 3, nw: 35, m: [12, 18], g: [5, 11], rb: [25, 100], lev: [3.2, 4.2], q: [50, 78], fl: ["Investitionsstau"],
      d: "Premiummarke für Outdoor- und Bergsportausrüstung. 35 % Direktvertrieb über den eigenen Onlineshop, Rest über Fachhandel, saisonal stark schwankende Working-Capital-Bindung." },
    { s: ["Backwaren", "Manufaktur"], cx: 6, nw: 3, m: [9, 14], g: [2, 6], rb: [25, 90], lev: [3.0, 4.0], q: [30, 52], fl: ["Investitionsstau", "Margendruck"],
      d: "Regionale Bäckereikette mit 60 Filialen und zentraler Produktion. Ergebnis getrieben von Standortqualität, Personalkostenquote und Energiepreisen im Backprozess." },
    { s: ["Nutrition", "Vitalstoffe"], cx: 3, nw: 25, m: [14, 21], g: [6, 13], rb: [15, 70], lev: [3.6, 4.6], q: [45, 70], fl: ["Margendruck"],
      d: "Anbieter von Nahrungsergänzungsmitteln mit Eigenmarke und Lohnfertigung für Dritte. Wachstum über Onlinekanäle und Apothekenlistung, Werbedruck bestimmt die Marge." },
    { s: ["Objekteinrichtung", "Möbelwerke"], cx: 4, nw: 28, m: [8, 13], g: [1, 5], rb: [30, 120], lev: [2.8, 3.6], q: [30, 52], fl: ["Kundenkonzentration", "Nachfolgesituation"],
      d: "Möbelhersteller für die Objektausstattung von Hotels, Büros und Pflegeeinrichtungen. Projektgeschäft mit langen Vorlaufzeiten und hoher Abhängigkeit von der Bauzyklik." },
    { s: ["Hausgeräte", "Küchenzubehör"], cx: 2.5, nw: 30, m: [11, 17], g: [3, 7], rb: [20, 85], lev: [3.4, 4.4], q: [40, 62], fl: ["Margendruck"],
      d: "Anbieter von Küchen- und Haushaltszubehör unter eigener Handelsmarke. Absatz über Fachhandel und Marktplätze, Beschaffung überwiegend aus Fernost mit entsprechendem Frachtkostenrisiko." },
    { s: ["Mineralbrunnen", "Getränke"], cx: 8, nw: 12, m: [15, 22], g: [0, 4], rb: [25, 95], lev: [3.8, 4.8], q: [40, 65], fl: ["Investitionsstau"],
      d: "Regionaler Mineralbrunnen mit eigener Quelle und Mehrweg-Abfüllung. Wirtschaftlicher Lieferradius von rund 150 Kilometern, Investitionsstau bei Abfülllinie und Kastenpark." },
  ],
};

let SEED = 20260803;
function rnd() { SEED = (SEED * 1664525 + 1013904223) % 4294967296; return SEED / 4294967296; }
function seedTo(v) { SEED = v; }
function seedGet() { return SEED; }
function nrm(s = 1) { return (rnd() + rnd() + rnd() + rnd() - 2) * s; }
const pick = (a) => a[Math.floor(rnd() * a.length)];
const band = ([a, b]) => a + rnd() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const eur = (v) => (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toLocaleString("de-DE") + " Mio. €";
const x = (v) => (Math.round(v * 10) / 10).toLocaleString("de-DE", { minimumFractionDigits: 1 }) + "×";
const hj = (n) => (Math.round(n) === 1 ? "1 Halbjahr" : Math.round(n) + " Halbjahre");
const gebote = (n) => (n === 1 ? "1 Gebot" : n + " Gebote");
const pct = (v) => (Math.round(v * 10) / 10).toLocaleString("de-DE", { minimumFractionDigits: 1 }) + " %";
const pctS = (v) => (Math.abs(v) < 0.05 ? "" : v > 0 ? "+" : "−") + pct(Math.abs(v));

function newDeal(type, market, sourcing = 2) {
  const sector = pick(SECNAMES);
  const a = pick(BOOK[sector]);
  const quality = clamp(band(a.q) + nrm(4), 10, 97);
  const revenue = band(a.rb) * SIZE_SCALE;
  const margin = clamp(band(a.m) + nrm(1), 4, 40);
  /* Preis orientiert sich am Bewertungsmultiple des Ziels, nicht am rohen
     Sektormultiple — und benutzt exakt denselben Qualitätsfaktor wie die
     Bewertung (QUAL_COEF). Sonst entstünde beim Closing ein systematischer
     Aufwertungsgewinn: jeder Deal wäre am Tag des Vollzugs mehr wert als der
     gezahlte Preis, ganz ohne unternehmerische Leistung.                    */
  const navF = 0.7 + QUAL_COEF * quality;
  /* Der Abschlag beim proprietären Deal ist der Ertrag der eigenen Origination:
     Wer besser sourct, spricht früher mit dem Gesellschafter und zahlt weniger. */
  const disc = type === "prop" ? 0.5 + rnd() * 0.5 + 0.12 * sourcing : 0;
  const askMult = clamp(market[sector] * navF * (0.96 + rnd() * 0.08) - disc, 4, 18);
  /* Bisheriges Wachstum und künftige Performance gegenüber dem Markt hängen
     zusammen — der Drift ist genau dieser dauerhafte Vorsprung oder Rückstand
     zum Sektor. Vorher wurde er erst beim Closing gewürfelt und `growth` nach
     dem Kauf nie wieder benutzt: die einzige Zahl auf der Karte, die nach
     Prognose aussah, sagte nichts vorher. Jetzt erklärt sie rund die Hälfte der
     Varianz, der Rest bleibt echte Unsicherheit. GROWTH_MEAN zentriert die
     Differenz, damit der Drift im Mittel null bleibt und die Bewertung nicht
     verrutscht.                                                              */
  const growth = band(a.g) + nrm(1);
  const drift = clamp(DRIFT_LOAD * (growth - SECTORS[sector].g - GROWTH_MEAN) + nrm(2.6), -6, 6);
  return {
    id: "d" + Math.floor(rnd() * 1e9),
    type, sector, revenue, margin, quality,
    growth, drift,
    // fester Schätzfehler des Datenraums; die Analysefähigkeit skaliert ihn nur
    dnoise: nrm(1),
    askMult,
    levCap: clamp(band(a.lev), 2.5, 5.5),
    capexPct: a.cx, nwcPct: a.nw,
    // Branchentypische Niveaus des Geschäftsmodells — Referenz für jede Entwicklung
    benchMargin: (a.m[0] + a.m[1]) / 2, benchCapex: a.cx, benchNwc: a.nw,
    flag: a.fl.length && rnd() < 0.55 ? pick(a.fl) : null,
    desc: a.d,
    name: pick(P1) + pick(P2) + " " + pick(a.s),
  };
}

function ebitdaOf(c) { return (c.revenue * c.margin) / 100; }

/* Entwicklung relativ zum Branchenniveau des Geschäftsmodells.
   Reifegrad 2 einer Dimension = branchentypisch. Darunter holt man schnell auf,
   darüber muss man dauerhaft nachlegen — sonst Rückfall zum Mittelwert.      */
const PLAT_BENCH = 2, ACC_BENCH = 2;
/* Operating Leverage: Umsatz wächst schneller als die Kostenbasis. Empirisch
   korrelieren Wachstum und Margenexpansion positiv (Gain.pro 2025: 58 % der
   wachsenden Unternehmen weiten die Marge aus, Median +130 bps, gegenüber
   44 % der schrumpfenden). Der früher pauschale Malus auf Wachstum ist raus —
   die Kosten des Wachstums stecken in drag, Capex und NWC während der Laufzeit. */
const opLeverage = (c) => {
  const base = c.hist && c.hist[0] ? c.hist[0].rev : c.revenue;
  return clamp((c.revenue / Math.max(1, base) - 1) * 1.5, 0, 1.5);
};
const targetMargin = (c) => (c.benchMargin ?? c.margin) + (c.plat - PLAT_BENCH) * 1.0
  + opLeverage(c) - overstretch(c) * 1.4
  // Gehälter stecken bereits in der ausgewiesenen Marge — nur die Veränderung seit Einstieg zählt
  - (seatLoad(c) - (c.baseLoad ?? seatLoad(c)))
  /* Nur Growth-Programme belasten die Marge: zusätzliche Vertriebsleute, Marketing
     und Anlaufverluste in neuen Märkten sind Run-Rate und stehen im EBITDA.
     Performance-Programme kosten Berater, Abfindungen und Parallelbetrieb — das
     sind Einmalaufwendungen unterhalb des EBITDA. Sie werden deshalb als
     Cash-Effekt gegen die Nettoverschuldung gebucht, nicht gegen die Marge.  */
  - (c.initA ? (c.initA.drag || 0) * (c.vcRun ? 0.5 : 1) : 0)
  + (c.marginDrift || 0)
  + (c.sector === "Industrials" && c.r3.skill >= 3 ? 0.3 : 0);
/* Verfall oberhalb des Branchenniveaus. Bis zur Benchmark ist ein Reifegrad ein
   Bestandskonto — eine konsolidierte Beschaffung verschwindet nicht wieder.
   Darüber schon: Preisdisziplin, Vertriebsschlagzahl und Prozessgüte über dem
   Marktniveau sind Zustände, die aktiv gehalten werden müssen. Ohne laufendes
   Programm zieht die Organisation zum Mittel zurück. Das ist zugleich der Preis
   der Zeit: Halten ist nicht mehr kostenlos.                                  */
const DECAY = 0.08;
function decayOf(lvl) { return DECAY * Math.max(0, lvl - 2); }

function stepCompany(c, market, ops) {
  const A = accEff(c), OS = overstretch(c);
  const opsMult = 1 + 0.1 * ops;
  // Wachstum relativ zum Sektorniveau: Stufe 2 = branchenüblich
  const gAnn = SECTORS[c.sector].g + (c.drift || 0) + (A - ACC_BENCH) * 1.5 * opsMult + nrm(6);
  const rev0 = c.revenue;
  c.revenue = Math.max(4, c.revenue * (1 + gAnn / 200));

  // Marge läuft auf das erreichbare Niveau zu: Aufholen schneller als Halten
  const target = targetMargin(c);
  c.vcRun = anyInit(c) ? (c.vcRun || 0) + 1 : 0;
  const pull = c.margin < target ? 0.30 * opsMult : 0.40;
  c.margin = clamp(c.margin + (target - c.margin) * pull + nrm(0.6), 3, 45);

  const eb = ebitdaOf(c);
  // Capex und Working Capital relativ zum Branchenniveau verbessern
  const cxPct = Math.max(0.5, (c.benchCapex ?? 4) * (1 - 0.07 * (c.plat - PLAT_BENCH)) + A * 0.6
    + sumInit(c, "cx")
    - (c.sector === "Industrials" && c.r3.skill >= 3 ? 0.5 : 0));
  const capex = (c.revenue * cxPct) / 200;
  const nwcPct = Math.max(-10, (c.benchNwc ?? 15) - (c.plat - PLAT_BENCH) * 2.5 + A * 2
    + sumInit(c, "nwcRun") + (c.nwcFix || 0));
  const nwc = (nwcPct / 100) * (c.revenue - rev0);

  /* ebitdaOf liefert einen Jahreswert — er ist die Basis für Bewertung und
     Leverage. Der Periodenschritt ist aber ein Halbjahr, deshalb geht nur die
     Hälfte in die Cash-Rechnung ein. Zins, Capex und NWC sind bereits
     Halbjahresgrößen.                                                        */
  const ebH = eb / 2;
  const rate = rateOf(c, eb);
  const interest = (c.netDebt >= 0 ? c.netDebt * rate : c.netDebt * c.rate * 0.4) / 200;
  const tax = 0.3 * Math.max(0, ebH - interest - capex);
  const fcf = ebH - interest - capex - nwc - tax;
  c.netDebt = c.netDebt - fcf;

  // Rückfall zum Mittel, solange in dieser Dimension keine Initiative läuft
  if (!c.initP) c.plat = Math.max(PLAT_BENCH, c.plat - decayOf(c.plat));
  if (!c.initA) c.acc = Math.max(ACC_BENCH, c.acc - decayOf(c.acc));

  c.holdQ += 1;
  /* Assetqualität folgt der realisierten Umsatz-CAGR seit Einstieg, nicht dem
     Wachstum einer einzelnen Periode. Vorher entschied das Rauschen von nrm(6)
     über das Vorzeichen, wodurch der Qualitätskanal für Growth praktisch tot war. */
  const relMargin = c.margin - (c.benchMargin ?? c.margin);
  const gPrem = cagrPrem(c);
  c.quality = clamp(
    c.quality + clamp(gPrem * 0.30, -1.2, 1.8)
    // stetig statt binär: wer sich der Benchmark nähert, wird dafür bezahlt,
    // statt bis zum Überschreiten die volle Strafe zu tragen
    + clamp(relMargin * 0.35, -0.8, 0.8) + 0.35 * (peopleLvl(c) - 2) - 1.8 * OS
    - (c.netDebt / eb > 5 ? 0.8 : 0) - Math.min(2.5, Math.max(0, 0.35 * (c.holdQ - 8))),
    5, 99
  );
  const covLev = c.netDebt / Math.max(0.5, eb);
  c.breach = covLev > (c.covLimit ?? 6.5) ? (c.breach || 0) + 1 : 0;
  // Für die Anzeige festhalten: die Karte zeigt die tatsächlichen Werte der Periode
  // Für die Anzeige auf Jahresbasis hochgerechnet, damit Karte und Dealflow
  // dieselbe Einheit sprechen wie EBITDA und Multiple.
  c.cf = { eb, interest: interest * 2, capex: capex * 2, nwc: nwc * 2, tax: tax * 2, fcf: fcf * 2, rate };
  return { fcf, eb, covLev };
}

const EVENTS = [
  { t: "Schlüsselkunde kündigt", m: "analysis", bad: 1,
    f: (c) => { c.revenue *= 0.80; c.drift = (c.drift || 0) - 0.8; } },
  // Wirkt tatsächlich auf den Sitz — feuert nur, wenn er besetzt ist
  { t: "CEO verlässt das Unternehmen", m: "operations", bad: 1,
    ok: (c) => c.ceo.skill > 0,
    f: (c) => { c.ceo = vacate(c.ceo); c.quality -= 6; c.margin -= 0.5; } },
  { t: "CFO wirft hin", m: "operations", bad: 1,
    ok: (c) => c.cfo.skill > 0,
    f: (c) => { c.cfo = vacate(c.cfo); c.quality -= 3; } },
  { t: "Wettbewerber senkt Preise", m: "operations", bad: 1,
    f: (c) => { c.margin -= 2.5; c.marginDrift = (c.marginDrift || 0) - 1.5; } },
  { t: "Add-on-Gelegenheit genutzt", m: null, bad: 0,
    ok: (c) => c.netDebt / Math.max(0.5, ebitdaOf(c)) < (c.covLimit ?? 6.5) - 1.5,
    f: (c) => { c.revenue *= 1.25; c.netDebt += ebitdaOf(c) * 1.6; } },
  { t: "Investitionsstau aufgedeckt", m: "analysis", bad: 1,
    f: (c) => { c.netDebt += ebitdaOf(c) * 0.8; c.capexPct = (c.capexPct ?? 4) + 1.5; } },
  { t: "Regulatorische Auflage", m: "operations", bad: 1,
    // Der Healthcare-Sitz 3 halbiert regulatorische Ereignisse
    ok: (c) => !(c.sector === "Healthcare" && c.r3.skill >= 3 && rnd() < 0.5),
    f: (c) => { c.margin -= 1.2; c.marginDrift = (c.marginDrift || 0) - 0.8; } },
  { t: "Großauftrag gewonnen", m: null, bad: 0,
    f: (c) => { c.revenue *= 1.14; c.quality += 3; } },
  { t: "Managementteam zieht ein Großprojekt vor", m: null, bad: 0,
    ok: (c) => anyInit(c),
    f: (c) => {
      const k = c.initP ? "initP" : "initA";
      c[k] = { ...c[k], doneQ: Math.max(1, c[k].doneQ - 1) };
    } },
];

const ARCHES = [
  { key: "sourcing", name: "Nordkap Capital",   attrs: { sourcing: 5, analysis: 2, negotiation: 2, operations: 2, financing: 1 }, aggr: 0.06, lev: 0.75, style: "Origination-getrieben" },
  { key: "ops",      name: "Hansabruck Partners", attrs: { sourcing: 2, analysis: 3, negotiation: 1, operations: 5, financing: 1 }, aggr: 0.02, lev: 0.6,  style: "Operativer Wertschöpfer" },
  { key: "fin",      name: "Aurum Partners",   attrs: { sourcing: 1, analysis: 2, negotiation: 3, operations: 1, financing: 5 }, aggr: 0.10, lev: 0.95, style: "Leverage-getrieben" },
  { key: "all",      name: "Vierturm Beteiligungen", attrs: { sourcing: 3, analysis: 3, negotiation: 2, operations: 2, financing: 2 }, aggr: 0.04, lev: 0.7,  style: "Generalist" },
];

/* ---------- Bewertungsparameter ----------
   QUAL_COEF steht bewusst an einer einzigen Stelle: Kaufpreis (newDeal) und
   Bewertung (markMultiple) müssen denselben Wert benutzen, sonst entsteht ein
   Aufwertungsgewinn allein durch den Vollzug.                                */
const QUAL_COEF = 0.006;    // Qualitätsaufschlag je Punkt auf das Sektormultiple
/* Kopplung zwischen bisherigem Wachstum und erwarteter Performance vs. Markt.
   DRIFT_LOAD 0,30 auf eine Streuung von 3,2 pp ergibt ein Signal mit sd 0,96 pp
   gegen ein Residuum von 0,98 pp — die Karte erklärt rund die Hälfte.        */
const DRIFT_LOAD = 0.45, GROWTH_MEAN = 1.6;
/* Schätzgüte des Datenraums: Analyse verkleinert den Fehler, beseitigt ihn nie.
   Ohne Due Diligence gibt es überhaupt keine Schätzung.                       */
const driftErrSd = (analysis) => clamp(4.6 - 0.90 * analysis, 0.3, 4.6);
const driftEstOf = (d, analysis) => d.drift + d.dnoise * driftErrSd(analysis);
const driftBandOf = (analysis) => 1.3 * 0.577 * driftErrSd(analysis);
const MULT_CAP = 1.60;      // Obergrenze: Vielfaches des Sektormultiples

const CAPITAL = 500;
const PERIODS = 20;         // 10 Jahre in Halbjahresschritten
const MIN_HOLD = 6;         // Mindesthaltedauer: 3 Jahre
/* Zielgrößen skalieren mit dem Fondsvolumen. Ein 500-Mio.-Fonds, der dieselben
   Unternehmen kauft wie ein 300-Mio.-Fonds, bekommt sein Kapital nicht investiert:
   Bei fünf Slots und im Schnitt 69 Mio. € Eigenkapital je Deal sind höchstens
   347 Mio. € gleichzeitig gebunden — der Rest liegt herum und verwässert die
   Rendite. SIZE_SCALE hebt die Umsatzbänder entsprechend an.                  */
const SIZE_SCALE = 1.25;
const MAX_SLOTS = 6;        // gleichzeitige Beteiligungen
const COV_HEADROOM = 1.2;   // Covenant-Spielraum über der Einstiegsverschuldung
const RESERVE_PROC = 0.85;  // Reservationspreis in der Auktion, Anteil der Preiserwartung
const RESERVE_PROP = 0.90;  // Reservationspreis des Gesellschafters beim Off-Market-Deal
const COV_FLOOR = 4.0;      // Untergrenze des Covenants
const BASE_RATE = 6.5;      // Basismarge auf die Akquisitionsfinanzierung (Euribor + Marge)
/* Kreditmarge staffelt sich mit der Verschuldung. Bis 3,0× gilt die Basismarge,
   darüber kostet jeder weitere Turn 75 bp — so wie ein Kreditvertrag über ein
   Margin Grid funktioniert. Vorher war Leverage bis zum Covenant gratis und die
   einzige Bremse der Bruch; jetzt zahlt man für ihn, bevor es weh tut.       */
const LEV_FREE = 3.0;       // Verschuldungsgrad, bis zu dem die Basismarge gilt
/* Der Aufschlag war auf 0,55 gesenkt worden, als die Verschuldung noch über den
   Covenant gebremst werden sollte. Gemessen war maximaler Leverage danach die
   dominante Strategie: 1,18 Wertung gegen 1,06 bei vorsichtiger Finanzierung,
   bei praktisch gleichem p10. Fremdkapital muss wieder kosten, was es kostet. */
const LEV_STEP = 0.85;      // Aufschlag in Prozentpunkten je Turn darüber
const rateOf = (c, eb) => {
  const lev = c.netDebt / Math.max(0.5, eb != null ? eb : ebitdaOf(c));
  return c.rate + Math.max(0, lev - LEV_FREE) * LEV_STEP;
};
/* Vergütung in Mio. € p.a. Marktanker ist der Branchenveteran auf Rating 2,5:
   bei 10 Mio. € EBITDA verdient der CEO 0,50, der CFO 0,30 und die Fachrolle 0,30.
   Die Unternehmensgröße geht mit der Wurzel ein — Gehälter wachsen deutlich
   langsamer als das EBITDA. Über dem Anker steigt die Kurve konvex: A-Player sind
   knapp und kosten überproportional, ein Entwicklungsprofil liegt darunter und
   wird mit wachsendem Rating automatisch teurer.                             */
const SEAT_PAY = { ceo: 0.50, cfo: 0.30, r3: 0.30 };
const PAY_ANCHOR = 2.5;     // Ratingniveau, auf dem SEAT_PAY gilt
const sizeFactor = (eb) => Math.sqrt(clamp(eb, 2, 60) / 10);
const ratingFactor = (sk) => 0.30 + 0.70 * Math.pow(Math.max(sk, 0.5) / PAY_ANCHOR, 1.35);
const payOf = (seat, sk, eb) => SEAT_PAY[seat] * sizeFactor(eb) * ratingFactor(sk);
const RETAINER_PCT = 0.30;  // Headhunter: 30 % eines Jahresgehalts, Marktstandard
const signPct = (sk) => 0.10 + 0.05 * sk;   // Signing Bonus als Anteil eines Jahresgehalts
const SEVER_YEARS = 1.0;    // Abfindung: zwölf Monatsgehälter des Amtsinhabers
// Der Retainer wird bei Mandatserteilung fällig, also auf Marktniveau, nicht
// auf dem erst später bekannten Rating des Kandidaten.
const retainerOf = (seat, eb) => payOf(seat, PAY_ANCHOR, eb) * RETAINER_PCT;
const signBonusOf = (seat, sk, eb) => payOf(seat, sk, eb) * signPct(sk);
const severanceOf = (seat, sk, eb) => payOf(seat, sk, eb) * SEVER_YEARS;
const INIT_SLOTS = 4;       // Initiativ-Slots pro Halbjahr fürs ganze Portfolio
const LTIP_SHARE = 0.06;    // Sweet Equity des MEP am Exiterlös

// Position 3 je Sektor, treibt Growth; jede Rolle hat einen eigenen Sondereffekt
const ROLE3 = {
  Industrials: { n: "CTO", fx: "−0,5 pp Capex durch Design-to-Cost" },
  Healthcare:  { n: "CTO", fx: "halbiert regulatorische Ereignisse" },
  Software:    { n: "CTO", fx: "zusätzlich halber Performance-Bonus" },
  Services:    { n: "Head of BD", fx: "senkt Kundenkonzentrationsrisiko" },
  Consumer:    { n: "CMO", fx: "+0,4× Multiple beim Exit an Strategen" },
};

/* Eine vakante Position spart kein Gehalt — sie wird interimistisch besetzt,
   und Interim ist teurer als der Vorgänger. Ohne diesen Boden hätte der Abgang
   des CEO die Marge verbessert und Nichtbesetzen wäre dominant gewesen.      */
const INTERIM = 2.2;             // Budgetlinie einer von Anfang an offenen Position
const INTERIM_PREMIUM = 1.25;    // Interim ist teurer als der Vorgänger
const vacate = (s) => ({ skill: 0, was: Math.max(s.skill, INTERIM) });
const seatPay = (s, seat, eb) => s.skill > 0 ? payOf(seat, s.skill, eb)
  : payOf(seat, s.was ?? INTERIM, eb) * INTERIM_PREMIUM;

const POACH = 0.0008;                        // Abwerbung: seltenes Randrisiko
/* Personalkosten in Prozentpunkten der Marge, damit sie sich in targetMargin
   einreihen: Summe der Jahresgehälter geteilt durch den Umsatz.             */
const seatLoad = (c) => {
  const eb = ebitdaOf(c);
  return (seatPay(c.ceo, "ceo", eb) + seatPay(c.cfo, "cfo", eb) + seatPay(c.r3, "r3", eb))
    / Math.max(4, c.revenue) * 100;
};
const peopleLvl = (c) => (c.ceo.skill + c.cfo.skill + c.r3.skill) / 3;
// Eine Fachposition kann den CEO nicht überholen — A-Player berichten nicht an C-Player
const cappedSkill = (c, seat) => seat === "ceo" ? c.ceo.skill : Math.min(c[seat].skill, c.ceo.skill + 1.5);
const isCapped = (c, seat) => seat !== "ceo" && c[seat].skill > c.ceo.skill + 1.5;
// Effektives Rating: gedeckelte Fachposition plus halber CEO, plus MEP-Bonus
const effSkill = (c, seat) => cappedSkill(c, seat) + 0.5 * c.ceo.skill + (c.ltip ? 0.5 : 0)
  + (seat === "cfo" && c.sector === "Software" ? 0.5 * cappedSkill(c, "r3") : 0);
/* Risiko hängt nicht an der Dimension, sondern daran, ob eine Maßnahme im
   Zugriff des Managements liegt oder auf Adoption durch Dritte angewiesen ist.
   "rel"  — Kosten, Working Capital, Pricing. Liefern zuverlässig (80–90 %) und
            scheitern nicht binär, sondern unterliefern.
   "tr"   — ERP, KI. Große interne Transformationsprogramme: aufwendig und
            binär im Ausgang, aber unter einem starken CFO durchaus beherrschbar.
            Liegen spürbar unter den verlässlichen Maßnahmen, aber im brauchbaren
            Bereich — ein Fehlschlag kostet dafür den vollen Sunk Cost.
   "hard" — Markteintritt. Der Erfolg hängt an Dritten: neuen Kunden in einem Markt,
            den man noch nicht kennt. Bleibt die schwächste Klasse.             */
const PARTIAL_DELIVERY = 0.35;   // Teillieferung, wenn eine "rel"-Maßnahme das Ziel verfehlt
const FAIL_SUNK = 0.15;          // Sunk Cost jedes Fehlschlags in EBITDA-Vielfachen
const initSuccess = (E, cls = "hard") => cls === "rel"
  ? clamp(0.60 + 0.055 * E, 0.55, 0.97)
  : cls === "tr"
    ? clamp(0.56 + 0.048 * E, 0.50, 0.92)
    : clamp(0.20 + 0.072 * E, 0.20, 0.82);
const CLS_LABEL = { rel: "verlässlich", tr: "Transformation", hard: "marktabhängig" };
// Ein starkes Team liefert schneller: ab effektivem Rating 3,2 in einem Halbjahr.
const initDur = (E) => Math.max(1, 4 - Math.floor(E / 1.6));
/* Jede Maßnahme steht je Beteiligung nur einmal zur Verfügung, deshalb wiegt der
   einzelne Gewinn schwerer als früher. Er hängt weiterhin deutlich am Team:
   effektives Rating 2 bringt 1,07, Rating 6 bringt 1,68.                       */
const initGain = (E) => 0.70 + 3.60 * E / (E + 4);
/* Je weiter über Branchenniveau, desto weniger bringt die nächste Maßnahme. Da
   erreichte Stufen nicht mehr verfallen, ist das die einzige Bremse gegen
   unbegrenztes Aufstocken — bewusst mild, damit Ausbauen sich lohnt.          */
const ceilingFactor = (lvl) => Math.max(0.15, 1 - 0.13 * Math.max(0, lvl - 2));
const ACC_SPREAD = [0.3, 1.3];   // Streubreite des Ergebnisses bei Acceleration

// Jede Maßnahme steht je Beteiligung genau einmal zur Verfügung.
/* Wie oft wurde diese Maßnahme in dieser Halteperiode schon aufgelegt?
   Vorher war jede genau einmal verfügbar. Das machte aus der Value Creation eine
   Abarbeitungsliste: sieben Maßnahmen, zwei Werkbänke, fertig — und ab der Mitte
   der Halteperiode gab es nichts mehr zu entscheiden. Jetzt lässt sich jede
   wiederholen; die Bremse ist wirtschaftlich statt formal. Zwei greifen
   zusammen: ceilingFactor macht jede weitere Stufe kleiner, und fitOf misst,
   ob überhaupt noch ein Defizit da ist, an dem die Maßnahme ansetzen kann.
   Ein zweites Cost-out auf einer Marge, die schon über Branchenniveau liegt,
   bringt nichts mehr — nicht weil eine Regel es verbietet, sondern weil nichts
   mehr zu holen ist.                                                          */
const initRuns = (c, id) => ((c && c.done) || []).filter((x) => x === id).length;
const initDone = (c, id) => initRuns(c, id) > 0;
/* Die zweite Auflage ist schwerer als die erste: die naheliegenden Hebel sind
   gezogen, was bleibt, sitzt tiefer in der Organisation.                      */
const REPEAT_MAX = 4;
const repeatMalus = (n) => ({ sm: -0.06 * n, dm: n >= 2 ? 1 : 0, gm: Math.pow(0.82, n) });
/* Performance und Growth sind zwei Werkbänke, nicht eine: das Cost-out treibt
   der CFO, die Expansion die Fachrolle. Sie liefen bisher hintereinander, was
   ein Wertsteigerungsprogramm über sieben Maßnahmen auf sieben Jahre streckte —
   der Grund, warum kurze Halteperioden im Spiel nichts einbrachten. Jetzt läuft
   je Beteiligung ein Programm pro Dimension parallel.                         */
const initIn = (c, dim) => (dim === "plat" ? c.initP : c.initA);
const initsOf = (c) => [c.initP, c.initA].filter(Boolean);
const anyInit = (c) => !!(c.initP || c.initA);
const sumInit = (c, key) => (c.initP && c.initP[key] || 0) + (c.initA && c.initA[key] || 0);

/* Maßnahmenkatalog. cls = Risikoklasse (rel / hard), sm = Modifikator Erfolgsquote,
   dm = Dauer, gm = Reifegradgewinn, cx = zusätzlicher Investitionsbedarf (pp vom
   Umsatz), oneOff = Einmalaufwand in EBITDA-Vielfachen (Cash, unterhalb des EBITDA),
   drag = laufende Margenbelastung (nur Growth), failCost = Sunk Cost bei Fehlschlag,
   failMargin = dauerhafter Margenschaden                                            */
const INITS = {
  plat: [
    { id: "opex", n: "Cost-out-Programm", cls: "rel", d: "Einkauf bündeln, Gemeinkosten straffen, Standorte verdichten.",
      sm: 0.02, dm: -1, gm: 0.8, oneOff: 0.10, cx: 0 },
    { id: "nwc", n: "NWC-Programm (Cash Release)", cls: "rel", d: "Forderungslaufzeiten, Bestände und Zahlungsziele. Setzt sofort Liquidität frei.",
      sm: 0.05, dm: 0, gm: 0.5, oneOff: 0.06, cx: 0, release: 0.35, nwcFix: -2 },
    { id: "erp", n: "ERP & Digitalisierung", cls: "tr", d: "Systemlandschaft ersetzen. Großer Hebel, langer Atem — und ein Fehlschlag bringt gar nichts.",
      sm: 0.03, dm: 1, gm: 1.7, oneOff: 0.30, cx: 2.0, capexFix: -0.5, nwcFix: -1.5, failCost: 0.35 },
    { id: "ai", n: "KI-gestützte Prozessautomatisierung", cls: "tr", d: "Angebotserstellung, Planung und Service automatisieren. Größter Hebel im Katalog, dafür der anspruchsvollste.",
      sm: -0.02, dm: 0, gm: 2.2, oneOff: 0.25, cx: 1.0, capexFix: -0.9, failCost: 0.30,
      req: (c) => effSkill(c, "cfo") >= 4, reqT: "Effektives CFO-Rating mindestens 4" },
  ],
  acc: [
    { id: "pen", n: "Pricing & Cross-Selling", cls: "rel", d: "Bestandskunden ausbauen, Preise durchsetzen. Kurzer Payback, begrenzte Höhe.",
      sm: 0.07, dm: -1, gm: 0.8, drag: 0.5, cx: 0, spread: [0.7, 1.1] },
    { id: "exp", n: "Markt- und Segmentexpansion", cls: "hard", d: "Neue Regionen oder Segmente. Breite Streuung, teurer Fehlschlag.",
      sm: 0.16, dm: 1, gm: 1.3, drag: 1.0, cx: 0, nwcRun: 2, spread: [0.3, 1.4],
      failCost: 0.25, failMargin: -0.8 },
    { id: "ma", n: "Add-on M&A", cls: "tr", d: "Zukauf eines Wettbewerbers, fremdfinanziert. Multiple-Arbitrage — und Covenant-Risiko.",
      sm: -0.05, dm: 1, gm: 0, drag: 0.4, cx: 0, ma: true },
  ],
};
const initById = (dim, id) => INITS[dim].find((i) => i.id === id);

/* ---------- Eignung einer Maßnahme ----------
   Bisher hatte jede Maßnahme einen festen Ertragsfaktor (gm). Damit war die
   Antwort auf jede Beteiligung dieselbe: alles machen, so schnell wie möglich.
   Keine Maßnahme war je falsch, nur unterschiedlich gut — und wo nichts falsch
   ist, gibt es keine Entscheidung.

   Jetzt hängt der Ertrag am konkreten Defizit des Unternehmens. Cost-out zahlt,
   wo Marge fehlt, und läuft leer, wo sie schon über dem Branchenniveau liegt.
   Ein NWC-Programm setzt nur frei, was gebunden ist. ERP und KI sind
   Fixkostenprogramme und rechnen sich erst ab einer gewissen Größe. Preissetzung
   braucht ein Asset, dem der Kunde etwas zutraut. Und Expansion lohnt in
   wachsenden Märkten — in einem stagnierenden verbrennt sie Marge.           */
function fitOf(id, c) {
  const eb = ebitdaOf(c);
  switch (id) {
    case "opex":  return clamp(0.55 + 0.28 * ((c.benchMargin ?? 12) - c.margin), 0.10, 1.70);
    case "nwc":   return clamp(0.30 + 0.055 * (c.nwcPct ?? 12), 0.15, 1.60);
    case "erp":   return clamp(0.30 + 0.050 * eb, 0.25, 1.60);
    case "ai":    return clamp(0.25 + 0.045 * eb, 0.25, 1.60) * clamp(0.5 + 0.25 * c.plat, 0.5, 1.3);
    case "pen":   return clamp(0.30 + 0.014 * c.quality, 0.30, 1.70);
    case "exp":   return clamp(0.15 + 0.16 * (SECTORS[c.sector].g + (c.drift || 0)), 0.05, 1.70);
    default:      return 1;
  }
}
/* Klartext für den Maßnahmenpicker — der Spieler muss die Eignung sehen können,
   sonst ist sie verstecktes Wissen statt einer Entscheidungsgrundlage.       */
function fitLabel(id, c) {
  const f = fitOf(id, c);
  const t = f >= 1.25 ? ["hoch", "var(--teal)"] : f >= 0.75 ? ["mittel", "var(--ink2)"]
    : f >= 0.45 ? ["gering", "var(--ox)"] : ["kaum", "var(--ox)"];
  const why = {
    opex: c.margin > (c.benchMargin ?? 12) + 0.5 ? "Marge liegt bereits über dem Branchenniveau"
      : c.margin < (c.benchMargin ?? 12) - 1 ? "Marge liegt deutlich unter dem Branchenniveau" : "Marge etwa auf Branchenniveau",
    nwc: (c.nwcPct ?? 12) >= 16 ? "hohe Kapitalbindung, entsprechend viel freisetzbar"
      : (c.nwcPct ?? 12) <= 8 ? "wenig gebundenes Kapital, wenig zu holen" : "durchschnittliche Kapitalbindung",
    erp: ebitdaOf(c) >= 18 ? "Größe trägt die Fixkosten des Programms"
      : ebitdaOf(c) <= 8 ? "für diese Größe ein teures Programm" : "Größe im mittleren Bereich",
    ai: ebitdaOf(c) >= 18 && c.plat >= 3 ? "Größe und Prozessreife tragen das Programm"
      : c.plat < 2.5 ? "Prozesse noch zu unreif für Automatisierung" : "Größe im mittleren Bereich",
    pen: c.quality >= 70 ? "starke Marktstellung, Preise sind durchsetzbar"
      : c.quality <= 45 ? "schwache Marktstellung, kaum Preissetzungsmacht" : "durchschnittliche Marktstellung",
    exp: SECTORS[c.sector].g >= 5 ? "wachsender Markt trägt die Expansion"
      : SECTORS[c.sector].g <= 3 ? "stagnierender Markt — Expansion kostet Marge ohne Gegenwert" : "Markt wächst moderat",
  }[id] || "";
  return { f, t: t[0], color: t[1], why };
}

/* Add-on-Preis: Branchenmultiple und Einstiegsmultiple der Plattform gemittelt,
   abzüglich der Größenarbitrage. Die Arbitrage schrumpft mit der Plattform —
   BCG/HHL finden, dass Buy-&-Build bei kleinen Plattformen deutlich outperformt
   und bei grossen Plattformen hinter Standalone-Deals zurückfällt.            */
/* Die Größenarbitrage schrumpft nicht nur mit der Plattform, sondern auch mit
   dem Marktumfeld: In einem heißgelaufenen Sektor sind auch kleine Ziele teuer.
   Und der Zukauf ist keine Einbahnstraße — sitzt ein Wettbewerber mit am Tisch,
   verschwindet die Arbitrage ganz. Vorher war jedes Add-on garantiert
   wertsteigernd, weil der Kaufpreis strukturell unter dem Plattformmultiple lag. */
const addonArb = (c, market) => {
  const size = clamp(2.4 - Math.max(0, ebitdaOf(c) - 10) * 0.05, 0.4, 2.4);
  const heat = market ? clamp((market[c.sector] / SECTORS[c.sector].m - 1) * 3.0, -0.6, 1.6) : 0;
  return clamp(size - heat - (c.addonComp || 0), -1.2, 2.4);
};
/* Der Preis eines Zukaufs bemisst sich am heutigen Bewertungsmultiple der
   Plattform, nicht an einer Formel aus Sektor und Einstiegspreis. Das war der
   eigentliche Konstruktionsfehler: Die Plattform wurde nach jeder Maßnahme höher
   bewertet, der Zukauf blieb bei einer am Einstieg verankerten Zahl — die
   Arbitrage wuchs also mit der eigenen Arbeit und erreichte am Ende sechs Turns.
   Jetzt ist sie genau das, was sie sein soll: ein Größenabschlag von bis zu
   2,4 Turns, der mit der Plattform schrumpft und in heißen Märkten verschwindet. */
const addonMultiple = (c, market) => Math.max(3, markMultiple(c, market) - addonArb(c, market));
const addonEbitda = (c) => ebitdaOf(c) * (c.addonSize ?? 0.275);
const ADDON_HEADROOM = 0.6;   // Mindestpuffer zum Covenant nach dem Zukauf
/* Pro-forma-Verschuldung nach dem Zukauf:
   (Nettoverschuldung PortCo + Kaufpreis) / (EBITDA PortCo + EBITDA Add-on)
   Reißt sie den Covenant, kommt die Finanzierung nicht zustande.              */
function addonCheck(c, market) {
  const addEb = addonEbitda(c);
  const mult = addonMultiple(c, market);
  const price = addEb * mult;
  const lev = (c.netDebt + price) / Math.max(0.5, ebitdaOf(c) + addEb);
  /* Die Banken finanzieren einen Zukauf nicht bis auf den letzten Zentimeter an
     den Covenant heran — sie verlangen Puffer für den Fall, dass die Integration
     schiefgeht. ADDON_HEADROOM ist genau dieser Puffer. Vorher genügte formale
     Einhaltung, und die Plattform stand nach dem Zukauf regelmäßig mit 0,4×
     Restluft da: Ein einziger Nachfrageeinbruch reichte für den Breach.       */
  const limit = (c.covLimit ?? 6.5) - ADDON_HEADROOM;
  return { addEb, mult, price, lev, limit, ok: lev <= limit };
}
/* Integrationsrisiko. Vorher hing der Erfolg allein am Rating der Fachrolle —
   eine Plattform mit unreifen Prozessen und 4,5× Verschuldung integrierte einen
   Zukauf genauso zuverlässig wie eine durchsanierte. Genau dort scheitert
   Buy-&-Build in der Praxis: zu früh, zu groß, zu fremdfinanziert.           */
function addonRisk(c) {
  const lev = c.netDebt / Math.max(0.5, ebitdaOf(c));
  return clamp(
    0.09 * (c.plat - 2.5)                      // reife Prozesse tragen die Integration
    - 0.07 * Math.max(0, lev - 3.0)            // jeder Turn über 3,0× kostet Handlungsfähigkeit
    - 0.55 * Math.max(0, (c.addonSize ?? 0.275) - 0.22),  // je größer der Bissen, desto riskanter
    -0.32, 0.12);
}

// Acceleration wirkt nur, soweit People und Platform sie tragen
const accEff = (c) => Math.min(c.acc, peopleLvl(c) + 1, c.plat + 1);
const overstretch = (c) => Math.max(0, c.acc - Math.min(peopleLvl(c) + 1, c.plat + 1));


/* Gemeinsamer Baustein für den Start einer Maßnahme. Spieler und KI benutzen
   dieselbe Funktion — vorher war die KI mit einem pauschalen Reifegradgewinn
   von 0,85 unterwegs, während der Spieler über initGain das Drei- bis Vierfache
   holte. Das war der eigentliche Grund, warum die Kohorte nie mithalten konnte. */
function buildInit(c, dim, id, market, quarter) {
  const spec = initById(dim, id);
  if (!spec) return null;
  const runs = initRuns(c, id);
  if (runs >= REPEAT_MAX) return null;
  const rep = repeatMalus(runs);
  if (spec.req && !spec.req(c)) return null;
  const seat = dim === "plat" ? "cfo" : "r3";
  const E = effSkill(c, seat) * (c.onboard > 0 ? 0.7 : 1);
  const dur = Math.max(1, initDur(E) + (spec.dm || 0) + rep.dm);
  const p = clamp(initSuccess(E, spec.cls) + (spec.sm || 0) + rep.sm + (spec.ma ? addonRisk(c) : 0), 0.1, 0.97);
  const ok = rnd() < p;
  const sp = spec.spread ? spec.spread[0] + rnd() * (spec.spread[1] - spec.spread[0])
    : dim === "acc" ? ACC_SPREAD[0] + rnd() * (ACC_SPREAD[1] - ACC_SPREAD[0]) : 1;
  let patch = { drag: spec.drag || 0, cx: spec.cx || 0, nwcRun: spec.nwcRun || 0 };
  let debt = ebitdaOf(c) * (spec.oneOff || 0);
  let chk = null;
  if (spec.ma) {
    chk = addonCheck(c, market);
    if (!chk.ok) return { blocked: chk };
    /* Der Reifegradgewinn ist bewusst klein: Der Wert eines Zukaufs steckt im
       zugekauften EBITDA, nicht in einer dauerhaft schnelleren Organik. Vorher
       gab es hier eine volle Stufe obendrauf — rund zwei Drittel des gemessenen
       Vorteils kamen aus dieser Doppelzählung.                               */
    patch = { ...patch, ma: true, addEb: chk.addEb, mult: chk.mult, price: chk.price, gain: 0.35, ok };
  } else {
    patch = { ...patch, gain: initGain(E) * sp * (spec.gm || 1) * rep.gm * fitOf(id, c)
      * ceilingFactor(dim === "plat" ? c.plat : c.acc), ok };
  }
  return { spec, dur, p, ok, debt, chk, slot: dim === "plat" ? "initP" : "initA",
    init: { dim, id, name: spec.n, doneQ: quarter + dur, ...patch } };
}

/* Maßnahmenpräferenz der KI-Fonds. Jeder Archetyp arbeitet seine eigene Liste
   ab — der Operator zuerst die Kostenseite, der Leverage-Fonds zuerst den
   Zukauf. Getroffen wird immer die erste noch offene Maßnahme der Dimension. */
const AI_PLAN = {
  ops:      { plat: ["opex", "erp", "nwc", "ai"], acc: ["pen", "exp"] },
  fin:      { plat: ["nwc", "opex"], acc: ["ma", "pen"] },
  sourcing: { plat: ["opex", "nwc", "erp"], acc: ["ma", "pen", "exp"] },
  all:      { plat: ["opex", "nwc", "erp", "ai"], acc: ["pen", "ma", "exp"] },
};

function makeSeats(d) {
  const r = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const retiring = d.flag === "Nachfolgesituation";
  return {
    ceo: { skill: retiring ? r(3, 4) : r(1, 4), retiring },
    cfo: { skill: rnd() < 0.35 ? 0 : r(1, 3) },
    r3: { skill: rnd() < 0.45 ? 0 : r(1, 3) },
  };
}
function makeCandidates() {
  const draw = (mid, sp) => clamp(mid + (rnd() * 2 - 1) * sp, 1, 5);
  return [
    { label: "Der Branchenveteran", shown: 2.5, span: 0.5, skill: draw(2.5, 0.5), dev: false, poach: 1,
      note: "Zwanzig Jahre im Segment. Marktgehalt, keine Überraschungen, kein Sprung." },
    { label: "Der A-Player aus dem Konzern", shown: 5, span: 0.5, skill: draw(5, 0.5), dev: false, poach: 2,
      note: "Sofort auf Topniveau — doppeltes Gehalt, wird selbst abgeworben." },
    { label: "Das Entwicklungsprofil", shown: 2, span: 1.5, skill: draw(2, 1.5), dev: true, poach: 1,
      note: "Zweite Reihe, erste eigene Führungsrolle. +0,25 Rating je Halbjahr bis 4,5." },
  ];
}
/* ---------- Due Diligence ----------
   Kosten fallen an, sobald der Auftrag erteilt ist — ob der Deal zustande kommt
   oder nicht. Alles andere wäre keine Entscheidung: Wenn Prüfung beim Zuschlag
   gratis ist, prüft man immer alles, und der Datenraum könnte gleich offen
   danebenliegen. Der Preis skaliert mit der Transaktionsgröße, weil ein
   Berateraufwand von 2 Mio. € auf ein Ziel mit 5 Mio. € EBITDA absurd wäre und
   auf eines mit 40 Mio. € geschenkt.                                         */
const DD_COST = 2;          // Referenzgröße für die Benchmarkstudie
const ddCostOf = (d) => clamp(0.006 * ebitdaOf(d) * d.askMult, 0.6, 3.5);
/* Die eigentliche Knappheit ist nicht Geld, sondern das Deal-Team. Wer parallel
   an drei Datenräumen sitzt, macht keinen davon gut. Die Analysefähigkeit
   bestimmt, wie viele Prozesse gleichzeitig laufen können — damit bekommt das
   Attribut neben der Schätzgüte eine zweite, greifbare Wirkung.              */
const ddCapOf = (analysis) => 1 + Math.floor(analysis / 2);
const ENTRY_FEE = 0.02;     // Transaktionskosten beim Kauf, in % des EV
const MGMT_FEE = 0.02;      // Management Fee p.a.
const HURDLE = 0.08;        // Hurdle (Preferred Return) p.a.
const CARRY = 0.20;         // Carried Interest
const INVEST_PERIOD = 10;   // Ende der Investitionsperiode (Halbjahr 10 = Jahr 5)
const BIL_DISC = 0.5;       // Multiple-Abschlag beim bilateralen Verkauf
/* Wer am Ende der Fondslaufzeit noch Beteiligungen hält, verkauft unter Zeitdruck
   an einen Markt, der das weiß. Der Abschlag war mit 1,5 Turns zu milde: "nie
   verkaufen" war damit genauso gut wie aktive Exitsteuerung, obwohl es keinerlei
   Können verlangt.                                                            */
const LIQ_DISC = 2.6;       // Abschlag bei Zwangsabwicklung am Laufzeitende
const PROC_FEE = 0.03;      // Transaktionskosten bei einer Auktion
const BIL_FEE = 0.02;       // Transaktionskosten beim bilateralen Verkauf
const CV_STAKE = 0.6;       // Anteil, der ins Continuation Vehicle verkauft wird
const CV_DISC = 0.95;       // Abschlag auf den NAV im Secondary-Markt
const CV_FEE = 0.015;
const IPO_PLACE = 0.4;      // platzierter Anteil
const IPO_DISC = 0.90;      // Emissionsabschlag
const IPO_FEE = 0.04;
const MAX_PROC = 3;         // gleichzeitig laufende Verkaufsprozesse
const PROC_Q = 2;           // Dauer eines Verkaufsprozesses in Halbjahren
const IPO_EBITDA = 25;      // Mindest-EBITDA für ein Börsenfenster

// Gebote am Ende eines Verkaufsprozesses
function makeOffers(c, market, funds, neg, q) {
  const fair = fairOf(c, market, neg, q);
  const out = [];
  const fit = rnd() < 0.6;
  out.push({
    buyer: "Strategischer Käufer", kind: "strat",
    price: fair * (fit ? 1.00 + rnd() * 0.08 : 0.92 + rnd() * 0.08),
    risk: 0.12,
    note: fit ? "Synergien im Kerngeschäft, aber Fusionskontrolle offen" : "Fremder Sektor, rein finanzgetriebenes Interesse",
  });
  const sponsors = funds.filter((f, i) => i > 0 && f.cash > fair * 0.9 && f.holdings.length < MAX_SLOTS);
  if (sponsors.length) {
    const s = pick(sponsors);
    out.push({
      buyer: s.name, kind: "sponsor", price: fair * (0.90 + rnd() * 0.12), risk: 0,
      note: "Secondary Buyout — sieht nur die veröffentlichten Kennzahlen",
    });
  }
  out.push({
    buyer: "Family Office", kind: "family",
    price: fair * (0.86 + rnd() * 0.06), risk: 0,
    note: "Zahlt am wenigsten, vollzieht aber sicher",
  });
  return out.sort((a, b) => b.price - a.price);
}
const LM_ANNOUNCE = 8;      // Ankündigung des Trophy Assets
const LM_DEAL = 10;         // Halbjahr, in dem es in den Dealflow kommt

function newLandmark(market) {
  const sector = pick(SECNAMES);
  const cands = BOOK[sector].filter((a) => a.q[1] >= 70);
  const a = cands.length ? pick(cands) : pick(BOOK[sector]);
  const revenue = 180 + rnd() * 110;
  const margin = clamp(band(a.m) + 3, 10, 38);
  const quality = clamp(band(a.q) + 14, 55, 97);
  return {
    id: "lm" + Math.floor(rnd() * 1e9),
    type: "landmark", sector, revenue, margin, quality,
    growth: band(a.g) + 1, drift: clamp(nrm(1.5) + 0.4, -6, 6), dnoise: nrm(1),
    askMult: clamp(market[sector] * (0.7 + 0.006 * quality) * (1.04 + rnd() * 0.06), 5, 19),
    levCap: clamp(a.lev[1] + 0.3, 3, 5.5),
    capexPct: a.cx, nwcPct: a.nw,
    benchMargin: (a.m[0] + a.m[1]) / 2, benchCapex: a.cx, benchNwc: a.nw,
    flag: null,
    desc: a.d,
    name: pick(P1) + pick(P2) + " " + pick(a.s) + " Gruppe",
  };
}

/* ---------- Bewertung ----------
   Kette: EBITDA × Multiple = Enterprise Value
          EV − Nettoverschuldung = Equity Value (100 %)
          × Anteilsquote = Wert des gehaltenen Anteils
          − Abschläge − Transaktionskosten = Erlös an den Fonds
   Der NAV kennt keinen Verhandlungsaufschlag: Verhandlungsgeschick wirkt
   erst in einer tatsächlichen Transaktion, nicht in der Bewertung.            */

/* Realisierte Umsatz-CAGR seit Einstieg, relativ zum Sektorwachstum (in pp). */
// Gibt null zurück, solange keine Halteperiode vorliegt — sonst stünde dort das
// Sektorwachstum, das ohne Due Diligence gar nicht bekannt sein darf.
function cagrOf(c) {
  const base = c.hist && c.hist[0] ? c.hist[0].rev : 0;
  if (!base || !c.holdQ) return null;
  const yrs = Math.max(0.5, c.holdQ / 2);
  return (Math.pow(Math.max(0.05, c.revenue / base), 1 / yrs) - 1) * 100;
}
function cagrPrem(c) {
  const g = cagrOf(c);
  return g == null ? 0 : g - SECTORS[c.sector].g;
}
/* Wachstum treibt das Exit-Multiple. Empirisch der stärkste Zusammenhang der
   Assetklasse: schnell wachsende Unternehmen werden mit 30–50 % höheren
   Multiples gehandelt. Greift erst nach einem vollen Jahr Halteperiode, damit
   beim Closing kein Bewertungssprung entsteht.                                */
function growthPrem(c) {
  if (!c.hist || c.hist.length < 3) return 0;
  return clamp(cagrPrem(c) * 0.050, -0.20, 0.45);
}
/* Die Assetqualität trägt das Exit-Multiple stärker als früher: seit der
   Cashflow-Korrektur liefert die Entschuldung nur noch die Hälfte, der Wert muss
   aus EBITDA-Wachstum und Multiple-Aufwertung kommen — was der empirischen
   Zerlegung ohnehin näher liegt als ein Leverage-getriebenes Ergebnis.      */
/* Altbestandsabschlag. Ein Asset, das seit Jahren im Portfolio liegt, verkauft
   sich schlechter: Die Käufer wissen, dass die naheliegenden Maßnahmen gehoben
   sind, der Verkäufer unter Zeitdruck steht und andere Fonds das Objekt bereits
   angesehen und abgelehnt haben. Ab vier Jahren Haltedauer 2 % je Halbjahr,
   gedeckelt bei 20 %. Das ist der zweite Preis der Zeit, neben dem IRR.       */
const STALE_FROM = 8, STALE_STEP = 0.02, STALE_MAX = 0.20;
const staleDisc = (c) => 1 - Math.min(STALE_MAX, STALE_STEP * Math.max(0, (c.holdQ || 0) - STALE_FROM));

function markMultiple(c, market) {
  /* Derselbe Qualitätsfaktor wie im Kaufpreis (QUAL_COEF) — ein Deal steht am
     Tag des Vollzugs zu Anschaffungskosten im Buch. Jede Aufwertung muss danach
     verdient werden: über EBITDA, über realisiertes Wachstum, über den Markt.
     MULT_CAP verhindert, dass sich Marktband, Qualität und Wachstumsprämie
     multiplikativ zu Multiples aufschaukeln, die es im Mittelstand nicht gibt. */
  const raw = market[c.sector] * (0.7 + QUAL_COEF * c.quality) * (1 + growthPrem(c));
  return Math.min(raw, market[c.sector] * MULT_CAP) * staleDisc(c);
}
/* Endfälligkeitsdruck. Käufer kennen die Laufzeit eines Fonds. Wer in den letzten
   zwei Jahren verkauft, verhandelt gegen jemanden, der weiß, dass verkauft werden
   muss — und preist das ein. Ohne diesen Effekt war "alles am Ende abstoßen"
   genauso gut wie aktive Exitsteuerung, obwohl es kein Können verlangt.      */
const END_PRESSURE_FROM = 4;   // Halbjahre vor Laufzeitende, ab denen es beginnt
function endPressure(q) {
  if (q == null) return 0;
  const left = PERIODS - q;
  if (left >= END_PRESSURE_FROM) return 0;
  return LIQ_DISC * (END_PRESSURE_FROM - left) / END_PRESSURE_FROM;
}

function dealMultiple(c, market, neg, q) {
  return Math.max(2, markMultiple(c, market) * (1 + 0.02 * neg) - endPressure(q));
}
const evOf = (c, mult) => ebitdaOf(c) * mult;
const eqvOf = (c, mult) => (evOf(c, mult) - c.netDebt) * (c.st ?? 1);

const navValueOf = (c, market) => Math.max(0, eqvOf(c, markMultiple(c, market)));
const fairOf = (c, market, neg, q) => Math.max(0, eqvOf(c, dealMultiple(c, market, neg, q)));

function navOf(f, market) {
  return f.holdings.reduce((s, c) => s + navValueOf(c, market), 0);
}

/* ---------- Fondsrenditen ----------
   Der Fonds ist nicht mehr am ersten Tag voll eingezahlt. Kapital wird abgerufen,
   wenn es gebraucht wird, und fließt zurück, sobald es realisiert ist. Genau
   daraus entsteht die Zeitdimension, die vorher fehlte:

   - Kapitalabruf (Call): jeder Mittelabfluss des Fonds — Eigenkapital, Fees,
     Due Diligence — wird zuerst aus recycelbaren Erlösen gedeckt, der Rest bei
     den Investoren abgerufen.
   - Verwendung der Erlöse: Bei jedem Exit entscheidest du, wie viel an die
     Investoren zurückfließt und wie viel im Fonds bleibt. Einbehalten geht nur
     innerhalb der Investitionsperiode und kumuliert höchstens bis zur Höhe des
     Commitments; danach wird zwingend voll ausgeschüttet.
   - Damit misst der TVPI den Gesamtwert je abgerufenem Euro, und der IRR misst,
     wann dieses Geld zurückkam. Ein Asset zehn Jahre zu halten ist jetzt teuer.  */
const RECYCLE_CAP = 1.0;    // kumuliert höchstens 100 % des Commitments

/* Gebührenreserve. Die Management Fee liegt innerhalb des Commitments — über die
   Laufzeit sind das rund 12–15 % davon. Investierbar sind also nie die vollen
   das volle Commitment, sondern das, was nach Reserve übrig bleibt. Genau das tut jedes
   Investment Committee, und es beseitigt die Überziehung an der Wurzel, statt
   sie hinterher zu verrechnen: Vorher rief der Fonds in vier von fünf Partien
   mehr ab, als überhaupt zugesagt war.                                        */
function feeReserveOf(f, quarter) {
  let res = 0;
  const cost = f.holdings.reduce((s, c) => s + (c.entryEquity || 0), 0);
  for (let t = quarter + 1; t <= PERIODS; t++) {
    // Nach der Investitionsperiode bemisst sich die Gebühr am Einstand des
    // Restportfolios. Konservativ gerechnet mit dem heutigen Bestand.
    const base = t <= INVEST_PERIOD ? CAPITAL : cost;
    res += (base * MGMT_FEE) / 2;
  }
  return Math.max(0, res - (f.recyc || 0));
}
// Was der Spieler tatsächlich einsetzen kann: offenes Commitment plus einbehaltene
// Erlöse, abzüglich der Gebühren, die bis zum Laufzeitende noch fällig werden.
const investableOf = (f, quarter) =>
  Math.max(0, (f.undrawn ?? CAPITAL) + (f.recyc || 0) - feeReserveOf(f, quarter));

/* Mittelabfluss. Reihenfolge: zuerst einbehaltene Erlöse, dann offenes
   Commitment. Das Commitment ist eine harte Grenze — reicht es nicht, kommt der
   Abruf nicht zustande. Für Gebühren, die dann ungedeckt bleiben (nach
   Totalverlusten möglich), läuft eine Verbindlichkeit auf, die mit der nächsten
   Ausschüttung verrechnet wird. Kein Abruf über das Commitment hinaus.       */
function spendFund(f, amt, quarter, accrue) {
  if (!(amt > 0)) return false;
  const fromRecyc = Math.min(amt, f.recyc || 0);
  let call = amt - fromRecyc;
  const room = Math.max(0, f.undrawn ?? CAPITAL);
  if (call > room + 1e-9) {
    if (!accrue) return false;               // Kauf scheitert, Commitment erschöpft
    f.accrued = (f.accrued || 0) + (call - room);
    call = room;
  }
  f.recyc = (f.recyc || 0) - fromRecyc;
  f.cash -= fromRecyc + call;
  if (call > 1e-9) {
    f.undrawn = (f.undrawn ?? CAPITAL) - call;
    f.calls = [...(f.calls || []), { q: quarter, amt: call }];
    f.drawn = (f.drawn || 0) + call;
  }
  return true;
}

/* Wie viel eines Exiterlöses überhaupt einbehalten werden darf. Zwei Schranken
   aus dem LPA: nur innerhalb der Investitionsperiode, und kumuliert höchstens
   bis zur Höhe des Commitments. Außerhalb wird zwingend voll ausgeschüttet.  */
function recycleRoom(f, net, quarter) {
  if (quarter > INVEST_PERIOD) return 0;
  return Math.min(net, Math.max(0, CAPITAL * RECYCLE_CAP - (f.recycled || 0)));
}

/* Verwendung eines Erlöses. `keep` ist die Entscheidung des GP in Prozent des
   Erlöses — Einbehalten bringt TVPI (mehr Kapital arbeitet je abgerufenem Euro)
   und kostet IRR (der Rückfluss an die Investoren verschiebt sich). Fehlt die
   Angabe, wird voll ausgeschüttet: das ist die Vorgabe, nicht der Automatismus
   von vorher.                                                                 */
function applyProceeds(f, net, costBasis, quarter, keep = 0) {
  if (!(net > 0)) return;
  f.proceeds = (f.proceeds || 0) + net;
  const rec = Math.min(recycleRoom(f, net, quarter), net * clamp(keep, 0, 1));
  if (rec > 0) {
    f.recycled = (f.recycled || 0) + rec;
    f.recyc = (f.recyc || 0) + rec;
    f.cash += rec;
  }
  let dist = net - rec;
  // Aufgelaufene Gebühren werden vor der Ausschüttung bedient
  if (dist > 0 && (f.accrued || 0) > 0) {
    const pay = Math.min(dist, f.accrued);
    f.accrued -= pay; dist -= pay; f.fees = (f.fees || 0);
  }
  if (dist > 1e-9) {
    f.dists = [...(f.dists || []), { q: quarter, amt: dist }];
    f.distTotal = (f.distTotal || 0) + dist;
  }
}

// Wert in den Händen der Investoren: ausgeschüttet + NAV + noch nicht reinvestierte Erlöse
const totalValueOf = (f, market) => (f.distTotal || 0) + navOf(f, market) + (f.recyc || 0);
const drawnOf = (f) => Math.max(1, f.drawn || 0);
const rvpiOf = (f, market) => navOf(f, market) / drawnOf(f);
// Brutto-MOIC auf Dealebene: misst Auswahl und Wertsteigerung, nicht das Deployment
const grossMoicOf = (f, market) => (f.investedTotal || 0) > 0
  ? ((f.proceeds || 0) + navOf(f, market)) / f.investedTotal : 0;

/* Europäischer Wasserfall über den ganzen Fonds, mit Catch-up. Die Hurdle läuft
   jetzt auf den tatsächlichen Abrufen und ab deren Zeitpunkt — nicht mehr auf
   das volle Commitment ab Tag null. Wer spät abruft, hat auch eine kleinere Vorzugsrendite
   zu überspringen; wer früh viel Kapital bindet, eine größere.                */
function carryOf(f, market, quarter) {
  const gain = totalValueOf(f, market) - (f.drawn || 0);
  const pref = (f.calls || []).reduce(
    (s, c) => s + c.amt * (Math.pow(1 + HURDLE, Math.max(0, quarter - c.q) / 2) - 1), 0);
  return gain > pref ? CARRY * gain : 0;
}
function tvpiOf(f, market, quarter) {
  return (totalValueOf(f, market) - carryOf(f, market, quarter)) / drawnOf(f);
}
// DPI: was tatsächlich an die Investoren zurückgeflossen ist, je abgerufenem Euro
function dpiOf(f, market, quarter) {
  const tv = totalValueOf(f, market);
  const drag = tv > 0 ? carryOf(f, market, quarter) / tv : 0;
  return ((f.distTotal || 0) * (1 - drag)) / drawnOf(f);
}

/* ---------- IRR ----------
   Zahlungsreihe aus Sicht der Investoren: Abrufe negativ zum Zeitpunkt des
   Abrufs, Ausschüttungen positiv, der verbleibende NAV plus nicht reinvestierte
   Liquidität als Schlusszahlung zum Stichtag. Nullstelle über Bisektion, weil
   die Reihe mehrere Vorzeichenwechsel haben kann und Newton dort abhaut.     */
function cashflowsOf(f, market, quarter) {
  const cf = [];
  (f.calls || []).forEach((c) => cf.push({ t: c.q / 2, v: -c.amt }));
  (f.dists || []).forEach((d) => cf.push({ t: d.q / 2, v: d.amt * (1 - carryDrag(f, market, quarter)) }));
  const terminal = (navOf(f, market) + (f.recyc || 0)) * (1 - carryDrag(f, market, quarter));
  if (terminal > 0) cf.push({ t: quarter / 2, v: terminal });
  return cf;
}
function carryDrag(f, market, quarter) {
  const tv = totalValueOf(f, market);
  return tv > 0 ? Math.min(0.5, carryOf(f, market, quarter) / tv) : 0;
}
function irrOf(f, market, quarter) {
  const cf = cashflowsOf(f, market, quarter);
  if (cf.length < 2 || quarter < 2) return 0;
  const npv = (r) => cf.reduce((s, p) => s + p.v / Math.pow(1 + r, p.t), 0);
  let lo = -0.95, hi = 3.0;
  if (npv(lo) < 0) return -0.95;
  if (npv(hi) > 0) return 3.0;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ---------- Wertung ----------
   Je zur Hälfte Multiple und Verzinsung, beide gegen den Anspruch eines guten
   Buyout-Fonds normiert: 2,0× TVPI und 15 % IRR ergeben je 1,00 Punkt. Eine
   Wertung von 1,00 ist damit ein Fonds auf Benchmarkniveau, 1,50 ein sehr guter,
   unter 0,60 wird es für das nächste Fundraising schwierig.

   Der Punkt der Zweiteilung: TVPI allein belohnt Sitzenbleiben, IRR allein
   belohnt schnelles Drehen kleiner Deals. Erst zusammen bilden sie die
   Entscheidung ab, um die es in diesem Geschäft wirklich geht — wann verkauft
   man ein Asset, das noch weiterläuft.                                       */
const TVPI_BENCH = 2.0, IRR_BENCH = 0.15;
function scoreOf(f, market, quarter) {
  const t = tvpiOf(f, market, quarter) / TVPI_BENCH;
  const i = irrOf(f, market, quarter) / IRR_BENCH;
  return 0.5 * clamp(t, -1, 4) + 0.5 * clamp(i, -1, 4);
}

/* Reifung einer Beteiligung am Periodenende: Onboarding, Search-Mandate,
   Abschluss laufender Maßnahmen, Entwicklung und Abwerbung der Amtsinhaber.
   Hauptspiel und Übungsmodus rufen exakt diese Funktion auf — der Übungsmodus
   läuft dadurch nachweislich auf derselben Logik wie eine echte Partie.      */
function maturePeople(c, mk, q, me, news, shortlists) {
  if (c.onboard > 0) c.onboard -= 1;
  /* Mehrere Positionen dürfen parallel besetzt werden — Headhunter arbeiten
     extern und binden keine Operating-Kapazität. Pro Position ein Mandat.   */
  if (c.searches && c.searches.length) {
    const still = [];
    c.searches.forEach((se) => {
      if (q < se.readyQ) { still.push(se); return; }
      if (me) {
        /* Nur einmal je Mandat eine Shortlist erzeugen. Vorher wurde bei jedem
           Periodenschluss eine neue gezogen, solange nicht entschieden war —
           man konnte die Kandidatenratings beliebig oft neu würfeln, indem man
           die Entscheidung vor sich her schob.                                */
        if (!se.waiting) shortlists.push({ uid: c.uid, name: c.name, seat: se.seat, cands: makeCandidates() });
        still.push({ ...se, waiting: true });
      }
      else c[se.seat] = { skill: Math.max(c[se.seat].skill, 3) };
    });
    c.searches = still;
  }
  ["initP", "initA"].forEach((slot) => {
    const IN = c[slot];
    if (!IN || q < IN.doneQ) return;
    const spec = IN.id ? initById(IN.dim, IN.id) : null;
    if (IN.ma) {
      const addRev = IN.addEb / Math.max(4, c.benchMargin ?? 12) * 100;
      if (IN.ok) { c.revenue += addRev; c.acc = Math.min(5, c.acc + 1.0); }
      else {
        // Gescheiterte Integration: die Akquisitionsschuld steht voll, das EBITDA
        // kommt nicht an. Der klassische Weg in den Covenant Breach.
        c.revenue += addRev * 0.35; c.margin -= 1.8;
        c.marginDrift = (c.marginDrift || 0) - 1.0; c.quality -= 7;
      }
    } else {
      // Verlässliche Maßnahmen scheitern nicht binär, sie unterliefern.
      // Adoptionsabhängige Programme liefern gar nichts und kosten den Sunk Cost.
      const share = IN.ok ? 1 : (spec && spec.cls === "rel" ? PARTIAL_DELIVERY : 0);
      if (share > 0) {
        const g = IN.gain * share;
        if (IN.dim === "plat") c.plat = Math.min(5, c.plat + g);
        else c.acc = Math.min(5, c.acc + g);
      }
      if (IN.ok) {
        if (spec && spec.release) c.netDebt -= ebitdaOf(c) * spec.release;
        if (spec && spec.nwcFix) c.nwcFix = (c.nwcFix || 0) + spec.nwcFix;
        if (spec && spec.capexFix) c.benchCapex = Math.max(0.5, (c.benchCapex ?? 4) + spec.capexFix);
      } else {
        c.netDebt += ebitdaOf(c) * (spec && spec.failCost != null ? spec.failCost : FAIL_SUNK);
        if (spec && spec.failMargin) c.marginDrift = (c.marginDrift || 0) + spec.failMargin;
      }
    }
    if (me) news.push({
      q, e: IN.ok ? "🛠️" : (spec && spec.cls === "rel" ? "➖" : "❌"),
      tone: IN.ok ? "pos" : "neg",
      t: IN.ma
        ? (IN.ok
          ? `<b>${c.name}</b>: Add-on integriert — ${eur(IN.addEb)} EBITDA zu ${x(IN.mult)} gekauft, Bewertung der Plattform liegt bei ${x(markMultiple(c, mk))}.`
          : `<b>${c.name}</b>: Integration des Add-ons gescheitert. Nur ein gutes Drittel des Umsatzes kommt an, die Akquisitionsschuld steht voll — Leverage jetzt ${x(c.netDebt / Math.max(0.5, ebitdaOf(c)))}.`)
        : IN.ok
          ? `<b>${c.name}</b>: ${IN.name || "Maßnahme"} abgeschlossen, Reifegrad +${IN.gain.toFixed(2)}${IN.dim === "acc" && IN.gain < 0.5 ? " — deutlich unter Erwartung." : IN.dim === "acc" && IN.gain > 1.1 ? " — weit über Erwartung." : "."}`
          : (spec && spec.cls === "rel"
            ? `<b>${c.name}</b>: ${IN.name || "Maßnahme"} verfehlt das Ziel — nur Reifegrad +${(IN.gain * PARTIAL_DELIVERY).toFixed(2)} statt +${IN.gain.toFixed(2)}.`
            : `<b>${c.name}</b>: ${IN.name || "Maßnahme"} gescheitert. Der Abbruch kostet ${eur(ebitdaOf(c) * (spec && spec.failCost != null ? spec.failCost : FAIL_SUNK))}.`),
    });
    c.done = [...(c.done || []), IN.id].filter(Boolean);
    c[slot] = null;
  });
  ["ceo", "cfo", "r3"].forEach((k) => {
    if (c[k].skill <= 0) return;
    if (c[k].retiring && c.holdQ >= 3) {
      c[k] = vacate(c[k]);
      if (me) news.push({ q, e: "👋", tone: "neg", t: `<b>${c.name}</b>: Der Gründer-CEO zieht sich zurück. Die Position ist vakant.` });
      return;
    }
    if (c[k].dev && c[k].skill < 4.5) c[k] = { ...c[k], skill: Math.min(4.5, c[k].skill + 0.25) };
    if (rnd() < POACH * c[k].skill * c[k].skill * (c[k].poach || 1) * (c.ltip ? 0.5 : 1)) {
      const nm = k === "ceo" ? "CEO" : k === "cfo" ? "CFO" : ROLE3[c.sector].n;
      c[k] = vacate(c[k]);
      if (me) news.push({ q, e: "🚪", tone: "neg", t: `<b>${c.name}</b>: Der ${nm} wurde abgeworben. Die Position ist vakant.` });
    }
  });
}

/* Zustand einer Beteiligung. Bewertet dieselben Größen, die ein Portfolio-Review
   abfragt: Finanzierung, Besetzung, Tragfähigkeit des Wachstums, Wertentwicklung
   und ob überhaupt etwas läuft. Der Befund mit dem höchsten Gewicht wird gezeigt. */
function healthOf(c, market) {
  const eb = ebitdaOf(c);
  const lev = c.netDebt / Math.max(0.5, eb);
  const head = (c.covLimit ?? 6.5) - lev;
  const searching = (c.searches || []).length;
  const vac = ["ceo", "cfo", "r3"].filter((k) => c[k].skill <= 0).length;
  const moic = (navValueOf(c, market) + (c.cashOut || 0)) / Math.max(0.01, c.costTotal);
  const fl = [];
  if (c.breach) fl.push({ w: 100, t: "Covenant gebrochen" });
  else if (head < 0.4) fl.push({ w: 88, t: `Covenant nur ${x(Math.max(0, head))} Luft` });
  if (vac > searching) fl.push({ w: 74, t: vac > 1 ? `${vac} Positionen vakant` : "Position vakant" });
  if (moic < 0.95) fl.push({ w: 66, t: `unter Einstand — ${moic.toFixed(2)}×` });
  if (overstretch(c) > 0.3) fl.push({ w: 58, t: "Wachstum überdehnt" });
  if (c.dd && c.margin < (c.benchMargin ?? c.margin) - 1.5) fl.push({ w: 44, t: "Marge unter Benchmark" });
  if (!anyInit(c) && !searching && c.holdQ >= 2) fl.push({ w: 38, t: "keine Maßnahme aktiv" });
  fl.sort((a, b) => b.w - a.w);
  const top = fl[0] || null;
  return { moic, attention: !!top && top.w >= 55, top, count: fl.length };
}

/* Value Bridge: eingesetztes Eigenkapital plus vier Effekte ergeben exakt den
   Nettoerlös. Wird vom Exit im Hauptspiel und vom Übungsmodus identisch genutzt. */
function makeBridge(c, gross, net) {
  const st = c.st ?? 1;
  /* Rekapitalisierungen während der Halteperiode gehören in die Brücke — sonst
     zeigt sie beim Exit nur den letzten Erlös und unterschlägt jeden Euro, der
     vorher schon an den Fonds zurückgeflossen ist. Erlöse aus Teilexits stehen
     bewusst nicht hier: die sind im Track Record bereits eigenständig gebucht. */
  const recap = c.recapOut || 0;
  const base = c.costLeft ?? c.entryEquity;
  const exitMult = ebitdaOf(c) > 0 ? (gross / st + c.netDebt) / ebitdaOf(c) : c.entryMult;
  const bEbitda = (ebitdaOf(c) - c.entryEbitda) * c.entryMult * st;
  const bMult = ebitdaOf(c) * (exitMult - c.entryMult) * st;
  const bDelev = (c.entryDebt - c.netDebt) * st;
  return {
    entry: base, ebitda: bEbitda, mult: bMult, delev: bDelev, dist: recap,
    cost: net - base - bEbitda - bMult - bDelev,
    exit: net + recap,
  };
}
// Gesamter Rückfluss eines Deals und die zugehörige Kostenbasis
const dealMoic = (c, net) => (net + (c.recapOut || 0)) / Math.max(0.01, c.costLeft ?? c.entryEquity);

/* ---------------- Komponente ---------------- */

export default function PeLeagues() {
  const [phase, setPhase] = useState("brief");
  const [attrs, setAttrs] = useState({ sourcing: 2, analysis: 3, negotiation: 2, operations: 3, financing: 2 });
  const [tab, setTab] = useState("deals");
  const [quarter, setQuarter] = useState(0);
  const [market, setMarket] = useState(() => { const m = {}; SECNAMES.forEach((s) => (m[s] = SECTORS[s].m)); return m; });
  const [funds, setFunds] = useState([]);
  const [deals, setDeals] = useState([]);
  const [bids, setBids] = useState({});
  const [feed, setFeed] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [dark, setDark] = useState(true);
  const [dd, setDd] = useState({});
  const [landmark, setLandmark] = useState(null);
  const [openFund, setOpenFund] = useState(null);
  const [exitQueue, setExitQueue] = useState([]);
  const [marketHist, setMarketHist] = useState([]);
  const [tvpiHist, setTvpiHist] = useState([]);   // je Halbjahr eine Wertungszahl pro Fonds
  const [shortlist, setShortlist] = useState([]);
  const [initPick, setInitPick] = useState(null);
  const [useProceeds, setUseProceeds] = useState(null);   // offene Verwendungsentscheidung
  const [rolling, setRolling] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [burst, setBurst] = useState(0);
  const [streak, setStreak] = useState(0);
  const prevScoreRef = React.useRef(null);

  const used = Object.values(attrs).reduce((a, b) => a + b, 0);
  const me = funds[0];

  useEffect(() => { window.scrollTo(0, 0); }, [tab, quarter]);

  function pushToast(t, tone) {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p.slice(-2), { id, t, tone }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 2900);
  }
  function fireConfetti() { setBurst((b) => b + 1); haptic([10, 30, 10]); }

  function start() {
    haptic([10, 20, 10]);
    const base = {
      cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
      // Kapitalkonten: cash = undrawn + recyc, jederzeit
      undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [],
    };
    const player = { id: 0, name: "Fonds I", me: true, ...base, attrs: { ...attrs } };
    const ais = ARCHES.map((a, i) => ({ id: i + 1, name: a.name, me: false, arch: a, ...base, attrs: a.attrs }));
    setFunds([player, ...ais]);
    setDeals(makeDeals(attrs.sourcing, market));
    setLandmark(newLandmark(market));
    setMarketHist([{ ...market }]);
    setTvpiHist([[player, ...ais].map(() => 0)]);
    setFeed([{ q: 0, e: "🏁", tone: "neu", t: `Vintage 2026 aufgelegt. Fünf Fonds, je ${eur(CAPITAL)}, zehn Jahre.` }]);
    setPhase("play");
  }

  /* Benchmarkstudie nach dem Closing: liefert nachträglich die Branchenreferenz,
     kostet aber die Hälfte einer DD zusätzlich zum bereits gezahlten Preis. */
  function runStudy(uid) {
    haptic(8);
    const c = me.holdings.find((h) => h.uid === uid);
    setFunds((F) => F.map((f, i) => {
      if (i !== 0) return f;
      const g = { ...f, holdings: f.holdings.map((h) => h.uid === uid ? { ...h, dd: true } : h) };
      spendFund(g, DD_COST / 2, quarter, true);
      return g;
    }));
    if (c) setFeed((p) => [{ q: quarter, e: "📊", tone: "neu",
      t: `<b>${c.name}</b>: Benchmarkstudie beauftragt — Branchenmarge ${pct(c.benchMargin)}, Marktwachstum ${pct(SECTORS[c.sector].g)}.` }, ...p]);
  }

  function runDD(dealId) {
    haptic(8);
    const d = deals.find((x2) => x2.id === dealId);
    if (!d) return;
    const cost = ddCostOf(d);
    setFunds((F) => F.map((f, i) => { if (i !== 0) return f; const g = { ...f }; spendFund(g, cost, quarter, true); return g; }));
    setDd((p) => ({ ...p, [dealId]: true }));
  }

  /* Vorher: Math.round(sourcing * 0,6). Das erzeugte tote Stufen — 1 und 2
     lieferten identisch einen Deal, 3 und 4 identisch zwei. Zwei von fünf
     Punkten waren wirkungslos. Jetzt ist die Zuführung stetig im Erwartungswert:
     0,55 Deals je Punkt, der Nachkommateil entscheidet per Zufall.           */
  function makeDeals(sourcing, mk) {
    const n = 0.55 * sourcing;
    const props = Math.min(3, Math.floor(n) + (rnd() < n % 1 ? 1 : 0));
    const out = [];
    for (let i = 0; i < 4; i++) out.push(newDeal("process", mk));
    for (let i = 0; i < props; i++) out.push(newDeal("prop", mk, sourcing));
    return out;
  }

  // Kurze, spürbare Verzögerung vor der Auflösung — Spannung statt Sofortergebnis
  function closeQuarter() {
    if (rolling) return;
    haptic(14);
    setRolling(true);
    setTimeout(() => { runQuarter(); setRolling(false); }, 620);
  }

  function runQuarter() {
    const F = funds.map((f) => ({ ...f, holdings: f.holdings.map((c) => ({ ...c })), realized: [...f.realized] }));
    const mk = { ...market };
    const news = [];
    const q = quarter + 1;

    /* 1 — Auktionen */
    deals.forEach((d) => {
      const entries = [];
      const b = bids[d.id];
      if (b && F[0].holdings.length < MAX_SLOTS) {
        const ev = ebitdaOf(d) * b.mult;
        const eq = ev - ebitdaOf(d) * b.lev + ev * ENTRY_FEE;
        if (eq <= investableOf(F[0], quarter)) entries.push({ f: 0, mult: b.mult, lev: b.lev, eq });
      }
      F.forEach((f, i) => {
        if (i === 0 || f.holdings.length >= MAX_SLOTS) return;
        const a = f.arch;
        /* Auch die anderen Fonds haben Origination. Ein Off-Market-Deal ist kein
           Naturschutzgebiet: je stärker deren Sourcing, desto häufiger sitzt
           jemand mit am Tisch. Das nimmt dem proprietären Kanal die Garantie,
           ohne ihm den Vorteil zu nehmen.                                     */
        const propChance = d.type === "prop" ? Math.max(0, 0.10 * (a.attrs.sourcing - 2)) : null;
        const partake = d.type === "prop" ? rnd() < propChance
          : rnd() < (d.type === "landmark" ? 0.92 : 0.74);
        if (!partake) return;
        const fit = (a.key === "ops" && d.margin < 14) || (a.key === "fin" && d.levCap > 4.2) || (a.key === "sourcing" && d.quality > 60);
        const lmBoost = d.type === "landmark" ? 0.07 : 0;
        const mult = d.askMult * (1 + a.aggr + lmBoost + (fit ? 0.05 : 0) + nrm(0.03));
        const lev = Math.min(d.levCap, d.levCap * a.lev);
        const ev = ebitdaOf(d) * mult;
        const eq = ev - ebitdaOf(d) * lev + ev * ENTRY_FEE;
        if (eq <= investableOf(f, q)) entries.push({ f: i, mult, lev, eq });
      });
      if (!entries.length) return;
      /* Reservationspreis. Vorher gab es keinen: bei einem proprietären Deal war
         der Spieler der einzige Bieter und konnte beliebig tief einsteigen — der
         Verkäufer hätte jeden Preis genommen. Jetzt gibt es unterhalb der
         Schmerzgrenze schlicht keine Transaktion.                             */
      const reserve = d.askMult * (d.type === "prop" ? RESERVE_PROP : RESERVE_PROC);
      const valid = entries.filter((e) => e.mult >= reserve);
      if (!valid.length) {
        if (b) news.push({
          q, e: "🚷", tone: "neg",
          t: `<b>${d.name}</b>: Der Verkäufer lehnt ab. Bei ${x(b.mult)} liegt dein Gebot unter seiner Schmerzgrenze — der Prozess wird ohne Abschluss beendet.`,
        });
        return;
      }
      valid.sort((p, r) => r.mult - p.mult || F[r.f].attrs.negotiation - F[p.f].attrs.negotiation);
      const w = valid[0];
      const f = F[w.f];
      const eb = ebitdaOf(d);
      /* Verhandlung wirkt jetzt auch beim Kauf, nicht nur beim Verkauf: zwischen
         Zuschlag und Vollzug wird über Kaufpreisanpassungen, Garantien und
         Working-Capital-Mechanik nachverhandelt. Ein Punkt = 1 % auf den Preis. */
      const bidMult = w.mult;
      w.mult = w.mult * (1 - 0.010 * f.attrs.negotiation);
      // Informationsrisiko bei proprietären Deals — durch Due Diligence abwendbar
      let hit = 0;
      if (d.type === "prop" && w.f === 0 && !dd[d.id]) {
        const p = clamp(0.5 - 0.09 * f.attrs.analysis, 0.05, 0.5);
        if (rnd() < p) { hit = 0.10 + rnd() * 0.14; }
      }
      const c = {
        uid: "c" + Math.floor(rnd() * 1e9), name: d.name, sector: d.sector, desc: d.desc,
        revenue: d.revenue, margin: d.margin * (1 - hit),
        quality: d.quality * (1 - hit / 2),
        netDebt: eb * w.lev, rate: BASE_RATE - 0.25 * f.attrs.financing,
        holdQ: 0, flag: d.flag,
        ...makeSeats(d), plat: 0.6 + rnd() * 1.2, acc: 0.6 + rnd() * 1.2, nwcFix: 0,
        addonSize: 0.20 + rnd() * 0.15,
        /* Wettbewerb um Zukäufe: in manchen Nischen sitzt immer ein strategischer
           Käufer mit am Tisch, in anderen nicht. Wird beim Closing gezogen und
           erst über die Add-on-Prüfung sichtbar.                              */
        addonComp: rnd() < 0.35 ? 0.8 + rnd() * 1.4 : 0,
        ltip: false, searches: [], initP: null, initA: null, onboard: 0,
        st: 1, proc: null, block: 0, lockUntil: null, cv: false, breach: 0,
        // Financing verschafft echten Covenant-Spielraum, nicht nur eine bessere Marge
        covLimit: Math.max(COV_FLOOR, w.lev + COV_HEADROOM + 0.10 * f.attrs.financing),
        capexPct: d.capexPct, nwcPct: d.nwcPct,
        benchMargin: d.benchMargin, benchCapex: d.benchCapex, benchNwc: d.benchNwc,
        dd: w.f === 0 ? !!dd[d.id] : true,   // ohne DD bleibt die Branchenreferenz auch nach Closing verborgen
        drift: d.drift ?? nrm(2.5), marginDrift: nrm(1.2), entryQuality: d.quality * (1 - hit / 2),
        entryMult: w.mult, entryEbitda: eb, entryDebt: eb * w.lev,
        // Enterprise Value − Fremdkapital + Transaktionskosten = eingesetztes Eigenkapital
        entryEV: eb * w.mult,
        entryFees: eb * w.mult * ENTRY_FEE,
        entryEquity: eb * w.mult - eb * w.lev + eb * w.mult * ENTRY_FEE,
        // costTotal bleibt unverändert, auch wenn Teile verkauft werden — Basis für den Gesamt-MOIC
        costTotal: eb * w.mult - eb * w.lev + eb * w.mult * ENTRY_FEE,
        cashOut: 0, recapOut: 0, costLeft: eb * w.mult - eb * w.lev + eb * w.mult * ENTRY_FEE,
        entryQ: q,
        hist: [{ rev: d.revenue, eb, nd: eb * w.lev, mg: d.margin * (1 - hit), ql: d.quality * (1 - hit / 2), eq: eb * w.mult - eb * w.lev }],
      };
      c.baseLoad = seatLoad(c);
      spendFund(f, c.entryEquity, q);
      f.investedTotal = (f.investedTotal || 0) + c.entryEquity;
      f.holdings.push(c);
      if (w.f === 0) {
        news.push({
          q, e: d.type === "landmark" ? "🏛️" : "🏆", tone: "pos",
          t: `${d.type === "landmark" ? "Trophy Asset gewonnen" : "Zuschlag"}: <b>${d.name}</b> bei ${x(w.mult)} EBITDA — Eigenkapital ${eur(c.entryEquity)}.${f.attrs.negotiation > 0 ? ` Geboten hattest du ${x(bidMult)}; die Nachverhandlung bis zum Vollzug hat ${eur((bidMult - w.mult) * eb)} herausgeholt.` : ""}`,
        });
        if (hit) news.push({ q, e: "⚠️", tone: "neg", t: `Nach Closing bei <b>${d.name}</b>: Die Marge liegt ${pct(hit * 100)} unter den Angaben im Information Memorandum.` });
      } else if (bids[d.id] || d.type === "landmark") {
        news.push({
          q, e: d.type === "landmark" ? "🏛️" : "⚔️", tone: "neg",
          t: `<b>${f.name}</b> ${d.type === "landmark" ? "sichert sich das Trophy Asset" : "überbietet dich bei " + d.name} mit ${x(w.mult)}.`,
        });
      }
    });

    /* 2 — KI-Fonds entwickeln ihre Beteiligungen */
    F.forEach((f, i) => {
      if (i === 0) return;
      f.holdings.forEach((c) => {
        if (c.searches && c.searches.length) return;
        const k = f.arch.key;
        /* Besetzung zuerst — auch die KI weiß inzwischen, dass ein Programm ohne
           Management nicht liefert. Der Operator besetzt am aggressivsten, der
           Financial Engineer am wenigsten. Die Ratings liegen unter dem, was ein
           Spieler über einen echten Search bekommen kann.                      */
        const amb = k === "ops" ? 4.0 : k === "fin" ? 3.0 : 3.6;
        const seat = ["ceo", "cfo", "r3"].find((s2) => c[s2].skill < amb - 0.5);
        if (seat && rnd() < 0.8) {
          const eb = ebitdaOf(c);
          const sk = clamp(amb + nrm(0.5), 1, 4.5);
          c.netDebt += retainerOf(seat, eb) + signBonusOf(seat, sk, eb)
            + (c[seat].skill > 0 ? severanceOf(seat, c[seat].skill, eb) : 0);
          c[seat] = { skill: sk };
          c.onboard = 1;
          return;
        }
        if (!c.ltip && rnd() < 0.5) c.ltip = true;
        // Dieselbe Maßnahmenmechanik wie beim Spieler, nur nach fester Präferenz
        const plan = AI_PLAN[k] || AI_PLAN.all;
        ["plat", "acc"].forEach((dim) => {
          const slot = dim === "plat" ? "initP" : "initA";
          if (c[slot]) return;
          if (dim === "acc" && overstretch(c) > 0.3) return;
          /* Die KI wählt nach Eignung, nicht nach Reihenfolge — sonst würde sie
             dieselbe Maßnahme endlos wiederholen, seit Wiederholung erlaubt ist. */
          const cands = (plan[dim] || []).filter((x2) => initRuns(c, x2) < REPEAT_MAX);
          if (!cands.length) return;
          const id = cands.reduce((a, b) => (fitOf(b, c) * Math.pow(0.82, initRuns(c, b))
            > fitOf(a, c) * Math.pow(0.82, initRuns(c, a)) ? b : a));
          if (fitOf(id, c) * Math.pow(0.82, initRuns(c, id)) < 0.30 && id !== "ma") return;
          const B = buildInit(c, dim, id, mk, q);
          if (!B || B.blocked) return;
          const head = (c.covLimit ?? 6.5) - c.netDebt / Math.max(0.5, ebitdaOf(c));
          if (B.debt > 0 && head < 0.6) return;
          c.netDebt += B.debt;
          c[slot] = B.init;
        });
      });
    });

    /* 3 — Halbjahr simulieren */
    F.forEach((f) => {
      f.holdings.forEach((c) => {
        stepCompany(c, mk, f.attrs.operations);
        if (rnd() < 0.15) {
          // Nur Ereignisse ziehen, die auf diese Beteiligung überhaupt anwendbar sind
          const pool = EVENTS.filter((e) => !e.ok || e.ok(c));
          if (pool.length) {
            const e = pick(pool);
            const mitig = e.m && f.attrs[e.m] >= 4 && rnd() < 0.5;
            if (!mitig) {
              e.f(c);
              const seat = e.t.startsWith("CEO") ? "ceo" : e.t.startsWith("CFO") ? "cfo" : null;
              if (f.me) news.push({
                q, e: e.bad ? (seat ? "🚪" : "🔻") : "🔺", tone: e.bad ? "neg" : "pos",
                t: `<b>${c.name}</b>: ${e.t}${seat ? " — die Position ist vakant." : ""}`,
              });
            }
          }
        }
      });
    });

    /* 3y — People: Search-Mandate reifen, Maßnahmen enden, Manager werden abgeworben */
    const shortlists = [];
    F.forEach((f) => {
      f.holdings.forEach((c) => maturePeople(c, mk, q, f.me, news, shortlists));
    });
    if (shortlists.length) setShortlist((p) => [...p, ...shortlists]);

    /* 3z — Covenant: zwei Perioden über der Grenze und die Beteiligung fällt an die Kreditgeber */
    F.forEach((f) => {
      f.holdings = f.holdings.filter((c) => {
        if ((c.breach || 0) >= 2) {
          if (f.me) news.push({
            q, e: "☠️", tone: "neg",
            t: `Covenant Breach bei <b>${c.name}</b>: Enforcement durch die Kreditgeber, das Eigenkapital von ${eur(c.entryEquity)} wird ausgebucht.`,
          });
          // Auch nach einem Breach zählen bereits ausgeschüttete Rekapitalisierungen
          f.realized.push({ name: c.name + " (Covenant Breach)", moic: dealMoic(c, 0) });
          return false;
        }
        if (f.me && (c.breach || 0) === 1) news.push({
          q, e: "⚠️", tone: "neg",
          t: `<b>${c.name}</b> reißt den Covenant von ${x(c.covLimit ?? 6.5)} bei ${x(c.netDebt / Math.max(0.5, ebitdaOf(c)))}. Noch ein Halbjahr bis zum Enforcement.`,
        });
        return true;
      });
    });

    /* 3a — Cash Sweep: Nettoliquidität fließt als Rekapitalisierung an den Fonds.
       NAV-neutral, verhindert aber, dass Cash über zehn Jahre im Unternehmen liegen bleibt. */
    F.forEach((f) => {
      f.holdings.forEach((c) => {
        if (c.netDebt < -0.5) {
          const sweep = -c.netDebt * (c.st ?? 1);
          c.netDebt = 0;
          c.cashOut = (c.cashOut || 0) + sweep;
          c.recapOut = (c.recapOut || 0) + sweep;
          applyProceeds(f, sweep, 0, q);
          if (f.me && sweep > 3) news.push({ q, e: "💵", tone: "pos", t: `<b>${c.name}</b> schüttet ${eur(sweep)} aus — die Beteiligung ist schuldenfrei.` });
        }
      });
    });

    /* 3b — Management Fee: 2 % p.a., nach der Investitionsperiode auf Anschaffungswerte */
    F.forEach((f) => {
      const base = q <= INVEST_PERIOD ? CAPITAL : f.holdings.reduce((s, c) => s + c.entryEquity, 0);
      const fee = (base * MGMT_FEE) / 2;
      spendFund(f, fee, q, true);   // Gebühren laufen notfalls auf
      f.fees = (f.fees || 0) + fee;
    });

    /* 4 — Markt */
    SECNAMES.forEach((s) => { mk[s] = clamp(mk[s] * (1 + nrm(0.05)), SECTORS[s].m * 0.65, SECTORS[s].m * 1.4); });
    if (rnd() < 0.18) {
      const s = pick(SECNAMES);
      mk[s] = clamp(mk[s] * 1.18, 0, SECTORS[s].m * 1.5);
      news.push({ q, e: "📈", tone: "pos", t: `Multiple-Expansion in <b>${s}</b>: Bewertungen ziehen deutlich an.` });
    }
    // Sektorrezession: trifft Bewertung und operatives Geschäft aller Beteiligten gleichzeitig
    if (rnd() < 0.14) {
      const s = pick(SECNAMES);
      mk[s] = clamp(mk[s] * 0.84, SECTORS[s].m * 0.55, 99);
      let hit = 0;
      F.forEach((f) => f.holdings.forEach((c) => {
        if (c.sector !== s) return;
        /* Ein Abschwung trifft nicht alle gleich: Wer hoch verschuldet ist, kann
           weder investieren noch Preise halten, verliert Personal an gesündere
           Wettbewerber und muss Working Capital abbauen statt Marktanteile zu
           verteidigen. Genau dieser Verstärkungseffekt fehlte — Rezession und
           Kapitalstruktur waren voneinander unabhängig.                       */
        const lv = c.netDebt / Math.max(0.5, ebitdaOf(c));
        const stress = 1 + 0.22 * Math.max(0, lv - 3.0);
        c.revenue *= 1 - 0.12 * stress;
        c.margin -= 1.5 * stress;
        c.drift = (c.drift || 0) - 1.0;
        c.breach = c.netDebt / Math.max(0.5, ebitdaOf(c)) > (c.covLimit ?? 6.5) ? (c.breach || 0) + 1 : 0;
        if (f.me) hit += 1;
      }));
      news.push({
        q, e: "📉", tone: "neg",
        t: `Sektorabschwung in <b>${s}</b>: Multiple-Kontraktion −16 %, Umsätze brechen ein.${hit ? ` Betrifft ${hit} deiner Beteiligungen.` : ""}`,
      });
    }

    /* 4b — Periodenstand je Beteiligung festhalten */
    F.forEach((f) => {
      f.holdings.forEach((c) => {
        const eb = ebitdaOf(c);
        c.hist = [...(c.hist || []), { rev: c.revenue, eb, nd: c.netDebt, mg: c.margin, ql: c.quality, eq: navValueOf(c, mk) + (c.cashOut || 0) }];
      });
    });

    /* 4c — Verkaufsprozesse reifen, Lock-ups laufen aus */
    const resolved = [];
    F[0].holdings.forEach((c) => {
      if (c.proc && q >= c.proc.resolveQ) {
        resolved.push({ uid: c.uid, name: c.name, offers: makeOffers(c, mk, F, F[0].attrs.negotiation, q) });
        c.proc = null;
      }
    });
    F[0].holdings = F[0].holdings.filter((c) => {
      if (c.lockUntil && q >= c.lockUntil) {
        const val = fairOf(c, mk, F[0].attrs.negotiation, q) * (1 - BIL_FEE);
        applyProceeds(F[0], val, c.entryEquity, q);
        F[0].realized.push({ name: c.name + " (Restbeteiligung)", moic: val / c.entryEquity });
        news.push({
          q, e: val >= c.entryEquity ? "🔔" : "📉", tone: val >= c.entryEquity ? "pos" : "neg",
          t: `Lock-up bei <b>${c.name}</b> ausgelaufen — Restbeteiligung für ${eur(val)} platziert.`,
        });
        return false;
      }
      return true;
    });

    /* 5 — KI-Exits */
    F.forEach((f, i) => {
      if (i === 0) return;
      f.holdings = f.holdings.filter((c) => {
        const val = fairOf(c, mk, f.attrs.negotiation, q);
        /* Die KI verkauft jetzt nach Verzinsung, nicht nach einer festen Schwelle:
           Wenn der erreichte Multiple auf die bisherige Haltedauer eine gute
           Rendite ergibt, wird realisiert — genau die Abwägung, die der Spieler
           auch treffen muss. Der Leverage-Fonds dreht schneller.              */
        const mo = val / Math.max(0.01, c.entryEquity);
        const irr = Math.pow(Math.max(0.05, mo), 2 / Math.max(1, c.holdQ)) - 1;
        const hurdle = f.arch.key === "fin" ? 0.18 : f.arch.key === "ops" ? 0.22 : 0.20;
        // Auch die KI weiß, dass der Preis gegen Laufzeitende fällt, und zieht vor
        const patience = (f.arch.key === "ops" ? 10 : 9) - (PERIODS - q <= 6 ? 2 : 0);
        if (c.holdQ >= MIN_HOLD && (irr > hurdle || c.holdQ >= patience || PERIODS - q <= 2)) {
          const net = val * (1 - PROC_FEE);
          applyProceeds(f, net, c.entryEquity, q);
          f.realized.push({ name: c.name, moic: net / c.entryEquity });
          return false;
        }
        return true;
      });
    });

    setFunds(F); setMarket(mk); setBids({}); setDd({});
    setMarketHist((p) => [...p, { ...mk }]);
    setTvpiHist((p) => [...p, F.map((fd) => scoreOf(fd, mk, q))]);
    const nd = makeDeals(F[0].attrs.sourcing, mk);
    if (q === LM_ANNOUNCE && landmark) {
      news.push({ q, e: "📣", tone: "neu", t: `Trophy Asset angekündigt: <b>${landmark.name}</b> kommt in zwei Halbjahren an den Markt. Halte Pulver trocken.` });
    }
    if (q === LM_DEAL && landmark) nd.unshift({ ...landmark, askMult: clamp(mk[landmark.sector] * (0.7 + 0.006 * landmark.quality) * 1.06, 5, 19) });
    setDeals(nd);
    setFeed((p) => [...news.reverse(), ...p].slice(0, 60));
    if (resolved.length) setExitQueue((p) => [...p, ...resolved]);
    setQuarter(q);
    if (q >= PERIODS) { liquidate(F, mk, q); setPhase("end"); }

    // Serie guter Halbjahre sichtbar machen — das eigentliche Momentum-Signal
    const newScore = scoreOf(F[0], mk, q);
    const prevScore = prevScoreRef.current;
    prevScoreRef.current = newScore;
    if (prevScore != null) {
      if (newScore > prevScore) setStreak((s) => s + 1); else setStreak(0);
    }
    const won = news.find((n) => n.tone === "pos" && (n.e === "🏆" || n.e === "🏛️"));
    const lost = news.find((n) => n.tone === "neg" && (n.e === "☠️" || n.e === "🚪"));
    if (won) { haptic([10, 20, 10]); if (won.e === "🏛️") fireConfetti(); pushToast(won.t, "pos"); }
    else if (lost) { haptic(25); pushToast(lost.t, "neg"); }
  }

  /* Ende der Fondslaufzeit: alle verbliebenen Beteiligungen werden zu
     bilateralen Konditionen abgewickelt — 0,5× Abschlag plus Kosten.     */
  function liquidate(F, mk, q) {
    const news = [];
    F.forEach((f, i) => {
      f.holdings.forEach((c) => {
        // Am Laufzeitende hat der Verkäufer keinen Verhandlungsspielraum
        const gross = Math.max(0, eqvOf(c, markMultiple(c, mk) - LIQ_DISC));
        const net = gross * (1 - BIL_FEE);
        applyProceeds(f, net, c.entryEquity, q);
        f.realized.push({ name: c.name + " (Tail-End)", moic: dealMoic(c, net) });
        if (i === 0) {
          const mo = net / c.entryEquity;
          news.push({
            q, e: mo >= 1 ? "⏳" : "💀", tone: mo >= 1 ? "neu" : "neg",
            t: `Tail-End-Verwertung: <b>${c.name}</b> zum Laufzeitende veräußert für ${eur(net)} — ${mo.toFixed(2)}× auf das eingesetzte Eigenkapital.`,
          });
        }
      });
      f.holdings = [];
    });
    setFunds([...F]);
    if (news.length) setFeed((p) => [...news, ...p].slice(0, 60));
  }

  /* ---- Entwicklung der Beteiligungen ---- */

  // Nur Value-Creation-Maßnahmen binden Operating-Kapazität, Suchen nicht.
  const busySlots = me ? me.holdings.reduce((n, c) => n + initsOf(c).length, 0) : 0;
  const maxSlots = me ? INIT_SLOTS + Math.floor(me.attrs.operations / 2) : INIT_SLOTS;
  const freeSlots = maxSlots - busySlots;

  function chargeCompany(uid, mult) {
    setFunds((F) => F.map((f, i) => i !== 0 ? f : {
      ...f, holdings: f.holdings.map((h) => h.uid !== uid ? h : { ...h, netDebt: h.netDebt + ebitdaOf(h) * mult }),
    }));
  }

  function startSearch(c, seat) {
    setFunds((F) => F.map((f, i) => i !== 0 ? f : {
      ...f, holdings: f.holdings.map((h) => h.uid !== c.uid ? h : {
        ...h, netDebt: h.netDebt + retainerOf(seat, ebitdaOf(h)),
        searches: [...(h.searches || []), { seat, readyQ: quarter + 1 }],
      }),
    }));
    const nm = seat === "ceo" ? "CEO" : seat === "cfo" ? "CFO" : ROLE3[c.sector].n;
    setFeed((p) => [{ q: quarter, e: "🔍", tone: "neu", t: `<b>${c.name}</b>: Search-Mandat für einen neuen ${nm} erteilt — Retainer ${eur(retainerOf(seat, ebitdaOf(c)))}.` }, ...p]);
  }

  function hire(item, cand) {
    haptic(10);
    const c = me.holdings.find((h) => h.uid === item.uid);
    setShortlist((p) => p.slice(1));
    if (!c) return;
    const had = c[item.seat].skill > 0;
    setFunds((F) => F.map((f, i) => i !== 0 ? f : {
      ...f, holdings: f.holdings.map((h) => h.uid !== c.uid ? h : {
        ...h, [item.seat]: { skill: cand.skill, dev: cand.dev, poach: cand.poach },
        searches: (h.searches || []).filter((se) => se.seat !== item.seat), onboard: 1,
        netDebt: h.netDebt + signBonusOf(item.seat, cand.skill, ebitdaOf(h))
          + (had ? severanceOf(item.seat, h[item.seat].skill, ebitdaOf(h)) : 0),
      }),
    }));
    const nm = item.seat === "ceo" ? "CEO" : item.seat === "cfo" ? "CFO" : ROLE3[c.sector].n;
    setFeed((p) => [{
      q: quarter, e: "🤝", tone: "pos",
      t: `<b>${c.name}</b>: Neuer ${nm} an Bord — Rating ${cand.skill.toFixed(1)}, Signing Bonus ${eur(signBonusOf(item.seat, cand.skill, ebitdaOf(c)))}, Gehalt ${eur(payOf(item.seat, cand.skill, ebitdaOf(c)))} p.a.${had ? ` Plus ${eur(severanceOf(item.seat, c[item.seat].skill, ebitdaOf(c)))} Abfindung für den Vorgänger.` : ""}`,
    }, ...p]);
  }

  function rejectAll(item) {
    const c = me.holdings.find((h) => h.uid === item.uid);
    setShortlist((p) => p.slice(1));
    if (!c) return;
    setFunds((F) => F.map((f, i) => i !== 0 ? f : {
      ...f, holdings: f.holdings.map((h) => h.uid !== c.uid ? h : {
        ...h, netDebt: h.netDebt + retainerOf(item.seat, ebitdaOf(h)) * 0.5,
        searches: (h.searches || []).map((se) => se.seat === item.seat ? { seat: item.seat, readyQ: quarter + 1 } : se),
      }),
    }));
    setFeed((p) => [{ q: quarter, e: "🔍", tone: "neu", t: `<b>${c.name}</b>: Shortlist abgelehnt, Suchmandat wird neu aufgesetzt.` }, ...p]);
  }

  function startInit(c, dim, id) {
    haptic(8);
    const B = buildInit(c, dim, id, market, quarter);
    if (!B) return;
    if (B.blocked) {
      setFeed((p2) => [{
        q: quarter, e: "🏦", tone: "neg",
        t: `<b>${c.name}</b>: Der Zukauf scheitert an der Finanzierung. Pro forma ${x(B.blocked.lev)} Leverage gegen einen Covenant von ${x(B.blocked.limit)} — die Banken steigen aus.`,
      }, ...p2]);
      return;
    }
    const { spec, dur, p, debt, chk } = B;
    const msg = spec.ma
      ? ` Add-on mit ${eur(chk.addEb)} EBITDA zu ${x(chk.mult)} für ${eur(chk.price)}, fremdfinanziert. Leverage pro forma ${x(chk.lev)}. Integrationswahrscheinlichkeit ${Math.round(p * 100)} %.`
      : ` Erfolgswahrscheinlichkeit ${Math.round(p * 100)} %, ${hj(dur)}.${spec.oneOff ? ` Einmalaufwand ${eur(ebitdaOf(c) * spec.oneOff)}.` : ""}`;

    setFunds((F) => F.map((f, i) => i !== 0 ? f : {
      ...f, holdings: f.holdings.map((h) => h.uid !== c.uid ? h : {
        ...h, netDebt: h.netDebt + debt, [B.slot]: B.init,
      }),
    }));
    setFeed((p2) => [{ q: quarter, e: spec.ma ? "🏢" : "🛠️", tone: "neu",
      t: `<b>${c.name}</b>: ${spec.n} gestartet.${msg}` }, ...p2]);
  }

  function toggleLtip(c) {
    setFunds((F) => F.map((f, i) => i !== 0 ? f : {
      ...f, holdings: f.holdings.map((h) => h.uid !== c.uid ? h : { ...h, ltip: true }),
    }));
    setFeed((p) => [{ q: quarter, e: "📜", tone: "neu", t: `<b>${c.name}</b>: Managementbeteiligung (MEP) aufgesetzt — ${Math.round(LTIP_SHARE * 100)} % Sweet Equity, dafür halbes Retention-Risiko und +0,5 effektives Rating.` }, ...p]);
  }

  /* ---- Exit-Mechanik ---- */
  /* ---- Exit-Mechanik ---- */

  const procCount = me ? me.holdings.filter((c) => c.proc).length : 0;
  const NEG = me ? me.attrs.negotiation : 0;

  function patchHolding(uid, patch) {
    setFunds((F) => F.map((f, i) => i !== 0 ? f : { ...f, holdings: f.holdings.map((h) => h.uid !== uid ? h : { ...h, ...patch }) }));
  }

  function startProcess(c) {
    patchHolding(c.uid, { proc: { resolveQ: quarter + PROC_Q } });
    setFeed((p) => [{ q: quarter, e: "📣", tone: "neu", t: `Verkaufsprozess für <b>${c.name}</b> eröffnet. Gebote liegen in zwei Halbjahren vor.` }, ...p]);
  }

function finalize(c, gross, buyer, feeRate, extra) {
    const net = gross * (1 - feeRate) * (c.ltip ? 1 - LTIP_SHARE : 1);
    /* Steht Spielraum zum Einbehalten zur Verfügung, entscheidet der GP — sonst
       wird direkt voll ausgeschüttet und der Dialog erscheint gar nicht.      */
    if (recycleRoom(me, net, quarter) > 0.5) {
      setUseProceeds({ c, gross, buyer, feeRate, extra, net });
      return;
    }
    settle(c, gross, buyer, feeRate, extra, 0);
  }

  function settle(c, gross, buyer, feeRate, extra, keep) {
    const net = gross * (1 - feeRate) * (c.ltip ? 1 - LTIP_SHARE : 1);
    const st = c.st ?? 1;
    const bridge = makeBridge(c, gross, net);
    setUseProceeds(null);
    setFunds((F) => F.map((f, i) => {
      if (i !== 0) return f;
      const g = { ...f, holdings: f.holdings.filter((h) => h.uid !== c.uid), realized: [...f.realized, { name: c.name, moic: dealMoic(c, net) }] };
      applyProceeds(g, net, c.costLeft ?? c.entryEquity, quarter, keep);
      return g;
    }));
    const recap = c.recapOut || 0;
    const mo = dealMoic(c, net);
    const exitMsg = `Exit <b>${c.name}</b> an ${buyer}: ${eur(net)} netto${recap > 0.5 ? ` zuzüglich ${eur(recap)} bereits ausgeschütteter Rekapitalisierungen` : ""} — ${mo.toFixed(2)}× auf das eingesetzte Eigenkapital.${extra || ""}`;
    setFeed((p) => [{
      q: quarter, e: mo >= 2 ? "🚀" : mo >= 1 ? "💰" : "💀", tone: mo >= 1 ? "pos" : "neg",
      t: exitMsg,
    }, ...p]);
    if (mo >= 1.5) { fireConfetti(); pushToast(`🚀 Großer Exit — ${mo.toFixed(2)}× auf ${c.name}`, "pos"); }
    else if (mo < 1) { haptic([30, 40, 30]); pushToast(`💀 Exit unter Einstand — ${mo.toFixed(2)}× auf ${c.name}`, "neg"); }
    else haptic(12);
    setSheet({ kind: "bridge", c, price: net, buyer, bridge });
  }

  function sellBilateral(c) {
    const mult = dealMultiple(c, market, NEG, quarter) - BIL_DISC;
    const gross = Math.max(0, eqvOf(c, mult));
    finalize(c, gross, "Off-Market-Erwerber", BIL_FEE);
  }

  // Continuation Vehicle: Teilexit an einen Secondary-Investor.
  // Der Fonds gibt Substanz ab und erhält Liquidität — kein Kapitalabfluss.
  function doCV(c) {
    const fair = fairOf(c, market, NEG, quarter);
    const gross = fair * CV_STAKE * CV_DISC;
    const net = gross * (1 - CV_FEE);
    const costSold = c.entryEquity * CV_STAKE;
    setFunds((F) => F.map((f, i) => {
      if (i !== 0) return f;
      const g = {
        ...f,
        holdings: f.holdings.map((h) => h.uid !== c.uid ? h : {
          ...h, st: (h.st ?? 1) * (1 - CV_STAKE), entryEquity: h.entryEquity * (1 - CV_STAKE),
          costLeft: Math.max(0.01, (h.costLeft ?? h.entryEquity) - costSold),
          cashOut: (h.cashOut || 0) + net, entryEbitda: h.entryEbitda, cv: true, proc: null,
        }),
        realized: [...f.realized, { name: c.name + " (Teilexit)", moic: net / costSold }],
      };
      applyProceeds(g, net, costSold, quarter);
      return g;
    }));
    setFeed((p) => [{
      q: quarter, e: "🔄", tone: "neu",
      t: `<b>${c.name}</b>: ${Math.round(CV_STAKE * 100)} % an ein Continuation Vehicle veräußert — ${eur(net)} netto, Anteil sinkt auf ${Math.round((c.st ?? 1) * (1 - CV_STAKE) * 100)} %.`,
    }, ...p]);
  }

  function doIPO(c) {
    const fair = fairOf(c, market, 0, quarter);
    const gross = fair * IPO_PLACE * IPO_DISC;
    const net = gross * (1 - IPO_FEE);
    const costSold = c.entryEquity * IPO_PLACE;
    setFunds((F) => F.map((f, i) => {
      if (i !== 0) return f;
      const g = {
        ...f,
        holdings: f.holdings.map((h) => h.uid !== c.uid ? h : {
          ...h, st: (h.st ?? 1) * (1 - IPO_PLACE), entryEquity: h.entryEquity * (1 - IPO_PLACE),
          costLeft: Math.max(0.01, (h.costLeft ?? h.entryEquity) - costSold),
          cashOut: (h.cashOut || 0) + net, lockUntil: quarter + 2, proc: null,
        }),
        realized: [...f.realized, { name: c.name + " (IPO)", moic: net / costSold }],
      };
      applyProceeds(g, net, costSold, quarter);
      return g;
    }));
    setFeed((p) => [{ q: quarter, e: "🔔", tone: "pos", t: `Börsengang <b>${c.name}</b>: ${Math.round(IPO_PLACE * 100)} % platziert für ${eur(net)} netto. Restbeteiligung ein Jahr im Lock-up.` }, ...p]);
  }

  /* Vorschau: Bewertung und Rückflüsse, bevor der Exit freigegeben wird */
  function previewExit(c, ch) {
    const st = c.st ?? 1;
    const eb = ebitdaOf(c);
    const mMult = markMultiple(c, market);
    const dMult = dealMultiple(c, market, NEG, quarter);

    let exMult = dMult;        // Multiple, das den Enterprise Value bestimmt
    let eqDisc = 1;            // prozentualer Abschlag auf Equity-Ebene
    let share = st;            // verkaufter Anteil
    let feeRate = 0, costBasis = c.entryEquity, note = "";

    const recap = c.recapOut || 0;
    const rows = [["EBITDA (LTM)", eur(eb)], ["Bewertungsmultiple", x(mMult)]];
    if (ch !== "ipo" && NEG > 0) rows.push([`Verhandlungsprämie +${NEG * 2} %`, x(dMult)]);

    if (ch === "bil") {
      exMult = dMult - BIL_DISC;
      feeRate = BIL_FEE;
      rows.push([`Abschlag bilateral`, `−${BIL_DISC.toFixed(1).replace(".", ",")}× EBITDA`]);
      note = "Sofortiger Vollzug, kein Marktrisiko. Jedes Halbjahr erneut möglich.";
    } else if (ch === "cv") {
      eqDisc = CV_DISC; share = st * CV_STAKE; feeRate = CV_FEE;
      costBasis = c.entryEquity * CV_STAKE;
      note = "Teilexit an einen Secondary-Investor. Liquidität jetzt, künftige Wertsteigerung anteilig weg. Jedes Halbjahr wiederholbar.";
    } else if (ch === "ipo") {
      exMult = mMult;          // am Kapitalmarkt zählt kein Verhandlungsgeschick
      eqDisc = IPO_DISC; share = st * IPO_PLACE; feeRate = IPO_FEE;
      costBasis = c.entryEquity * IPO_PLACE;
      note = "Die Restbeteiligung wird nach einem Jahr Lock-up zum dann gültigen Kurs verwertet.";
    } else {
      note = "Der Preis steht erst bei Prozessende — bis dahin bewegen sich Multiples und EBITDA weiter.";
    }

    const ev = eb * exMult;
    const eqv100 = ev - c.netDebt;
    const gross = Math.max(0, eqv100 * share * eqDisc);
    const net = gross * (1 - feeRate);

    rows.push(["Exit-Multiple", x(exMult)], ["Enterprise Value", eur(ev)],
      ["− Nettoverschuldung", "−" + eur(c.netDebt)], ["= Equity Value (100 %)", eur(eqv100)]);
    if (share < 1) rows.push([`× verkaufter Anteil ${Math.round(share * 100)} %`, eur(eqv100 * share)]);
    if (eqDisc < 1) rows.push([ch === "cv" ? "− Secondary-Abschlag" : "− Emissionsabschlag",
      `−${Math.round((1 - eqDisc) * 100)} %`]);

    if (ch === "proc") {
      const fair = Math.max(0, eqv100 * st);
      rows.push(["Erwartete Gebotsspanne", eur(fair * 0.86) + " – " + eur(fair * 1.08)],
        [`Transaktionskosten ${PROC_FEE * 100} %`, "M&A-Berater, VDD, Legal"],
        ["Gebote liegen vor in", hj(PROC_Q)]);
      if (recap > 0.05) rows.push(["Bereits ausgeschüttet (Recap)", eur(recap)]);
      setSheet({ kind: "confirm", c, ch, rows, net: 0, note, moic: 0, dpiPct: 0 });
      return;
    }

    rows.push(["= Bruttoerlös", eur(gross)],
      [`− Kosten ${(feeRate * 100).toFixed(1).replace(".", ",")} %`, "−" + eur(gross * feeRate)]);
    if (ch === "cv") rows.push(["Anteil danach", Math.round(st * (1 - CV_STAKE) * 100) + " %"]);
    if (ch === "ipo") rows.push(["Lock-up Restbeteiligung", "1 Jahr"]);
    /* Bei einem Vollverkauf zählen die bisherigen Rekapitalisierungen in den
       Deal-MOIC. Bei einem Teilexit nicht — dort wird die verkaufte Tranche
       gegen ihre eigene Kostenbasis gemessen, alles andere wäre doppelt.    */
    const full = ch === "bil";
    if (recap > 0.05) rows.push([full ? "+ bereits ausgeschüttet (Recap)" : "Bereits ausgeschüttet (Recap)", eur(recap)]);
    if (full && recap > 0.05) rows.push(["= Gesamtrückfluss", eur(net + recap)]);

    setSheet({
      kind: "confirm", c, ch, rows, net, note,
      moic: full ? dealMoic(c, net) : net / costBasis,
      moicLabel: full ? (recap > 0.05 ? "MOIC inkl. Ausschüttungen" : "MOIC (Deal)") : "MOIC der verkauften Tranche",
      dpiPct: net / CAPITAL,
    });
  }

  function confirmExit() {
    haptic(10);
    const { c, ch } = sheet;
    const live = me.holdings.find((h) => h.uid === c.uid) || c;
    setSheet(null);
    if (ch === "bil") sellBilateral(live);
    else if (ch === "cv") doCV(live);
    else if (ch === "ipo") doIPO(live);
    else startProcess(live);
  }

  function decideOffer(offer, action) {
    haptic(action === "abort" ? 20 : 10);
    const item = exitQueue[0];
    const c = me.holdings.find((h) => h.uid === item.uid);
    const shift = () => setExitQueue((p) => p.slice(1));
    if (!c) { shift(); return; }

    if (action === "abort") {
      patchHolding(c.uid, { block: quarter + 2 });
      setFeed((p) => [{ q: quarter, e: "🚫", tone: "neg", t: `Verkaufsprozess für <b>${c.name}</b> abgebrochen. Ein Jahr Sperre — die anderen Fonds haben es gesehen.` }, ...p]);
      shift(); return;
    }

    let final = offer, extra = "";
    if (action === "reneg") {
      const r = rnd();
      if (r < 0.60) {
        final = { ...offer, price: offer.price * (1.05 + rnd() * 0.03) };
        extra = " Nachverhandlung erfolgreich.";
      } else if (r < 0.85) {
        const second = item.offers.filter((o) => o !== offer).sort((a, b) => b.price - a.price)[0];
        if (!second) {
          patchHolding(c.uid, { block: quarter + 2 });
          setFeed((p) => [{ q: quarter, e: "🚫", tone: "neg", t: `<b>${offer.buyer}</b> springt bei ${c.name} ab. Kein weiteres Gebot, ein Jahr Sperre.` }, ...p]);
          shift(); return;
        }
        final = second;
        extra = ` ${offer.buyer} ist abgesprungen.`;
      } else {
        extra = " Nachverhandlung ohne Ergebnis.";
      }
    }

    if (final.risk && rnd() < final.risk) {
      patchHolding(c.uid, { block: quarter + 2 });
      setFeed((p) => [{ q: quarter, e: "⚖️", tone: "neg", t: `Die Fusionskontrolle stoppt den Verkauf von <b>${c.name}</b>. ${final.buyer} zieht zurück, ein Jahr Sperre.` }, ...p]);
      shift(); return;
    }

    finalize(c, final.price, final.buyer, PROC_FEE, extra);
    shift();
  }

  const rank = useMemo(() => funds.map((f) => ({
    ...f, tvpi: tvpiOf(f, market, quarter), dpi: dpiOf(f, market, quarter),
    irr: irrOf(f, market, quarter),
    gross: grossMoicOf(f, market), score: scoreOf(f, market, quarter),
  })).sort((a, b) => b.score - a.score), [funds, market, quarter]);

  /* ---------------- Views ---------------- */

  if (phase === "brief") {
    return (
      <div className={"pel" + (dark ? " dark" : "")}><style>{CSS}</style>
        <div className="wrap">
          <div style={{ padding: "36px 16px 4px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="eyebrow">Briefing · Vintage 2026</div>
              <h1 className="disp" style={{ fontSize: 38, margin: "8px 0 0" }}>PE-Leagues</h1>
            </div>
            <button className="theme" style={{ borderColor: "var(--rule)", color: "var(--ink)" }}
              onClick={() => setDark(!dark)} aria-label="Darstellung wechseln">{dark ? "☀" : "☾"}</button>
          </div>

          <div className="card">
            <h3 className="disp">Worum es geht</h3>
            <div className="pad" style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink2)" }}>
              Du führst einen Buyout-Fonds über {eur(CAPITAL)} und zehn Jahre, getaktet in Halbjahren. Vier weitere Fonds sitzen in derselben
              Kohorte und sehen denselben Dealflow. Du kaufst Unternehmen, entwickelst sie über die
              Halteperiode und verkaufst sie wieder. Am Ende zählt, was du aus den {eur(CAPITAL)} gemacht hast.
            </div>
          </div>

          <div className="card">
            <h3 className="disp">Der Ablauf</h3>
            <div className="pad" style={{ paddingTop: 4, fontSize: 13, lineHeight: 1.62, color: "var(--ink2)" }}>
              Jedes Halbjahr läuft gleich ab: Ziele ansehen, bieten, das Portfolio entwickeln, gegebenenfalls
              verkaufen — dann „Halbjahr abschließen“. Erst dann lösen sich alle Gebote gleichzeitig auf.
              Gebote sind verdeckt, das höchste Multiple gewinnt, bei Gleichstand entscheidet dein Verhandlungswert.
            </div>
          </div>

          {/* ---------- 1 · Einstieg ---------- */}
          <div className="secthead"><span className="eyebrow">1 · Einstieg</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>Kaufen</span></div>
          <div className="card">
            <Def t="Multiple — die Preiseinheit">
              Unternehmen werden in Vielfachen ihres Jahresgewinns gehandelt. <b>EBITDA</b> ist der operative
              Gewinn, das <b>Multiple</b> der Faktor darauf. 10 Mio. € EBITDA zu 8,5× ergibt einen Unternehmenswert
              von 85 Mio. €. Alle Preise im Spiel sind solche Multiples.
            </Def>
            <Def t="Zwei Wege zu einem Ziel">
              Im <b>strukturierten Prozess</b> bietet die ganze Kohorte mit. Der Verkäufer hat die Zahlen
              aufbereitet, dafür treibt der Wettbewerb den Preis. Ein <b>proprietäres</b> Ziel spricht nur mit
              dir — kein Bieterwettbewerb, deshalb günstiger, aber die Zahlen sind lückenhaft und du trägst das
              Risiko, dass nach dem Kauf etwas auftaucht.
            </Def>
            <Def t="Red Flag und Angle">
              Jedes Ziel trägt höchstens ein Merkmal. Ein <b>Red Flag</b> (rot) ist ein Problem, das den Preis
              drückt — etwa ein Kunde mit zu großem Umsatzanteil oder aufgeschobene Investitionen. Ein
              <b> Angle</b> (gold) ist das Gegenteil: ein Grund, mehr zu zahlen, weil sich darauf eine Strategie
              bauen lässt.
            </Def>
            <Def t="Due Diligence">
              0,6 % des Transaktionswerts für die Prüfung vor dem Kauf, fällig unabhängig vom Ausgang. Sie bestätigt die Zahlen, deckt versteckte Probleme
              auf und liefert vor allem die <b>Branchenreferenz</b>: wie hoch die Marge in dieser Branche üblicherweise
              ist und wie schnell der Markt wächst. Ohne diese beiden Werte kennst du zwar die Zahlen deines Ziels,
              kannst sie aber nicht einordnen — und das bleibt auch nach dem Kauf so.
            </Def>
            <Def t="Eigenkapital und Fremdkapital">
              Du finanzierst jeden Kauf teils aus dem Fonds, teils über Bankschulden. Mehr Schulden heißt weniger
              eigenes Kapital je Deal und damit ein höherer Faktor auf dein Geld — aber die Bank setzt eine
              Obergrenze, den <b>Covenant</b>. Steht die Verschuldung zwei Halbjahre über dieser Grenze, übernehmen
              die Kreditgeber und dein Eigenkapital ist vollständig verloren.
            </Def>
            <Def t="Trophy Asset">
              Einmal je Fondsgeneration kommt ein außergewöhnlich großes Ziel auf den Markt. Doppeltes Ticket,
              ein Jahr Vorlauf zum Sparen, alle bieten mit.
            </Def>
          </div>

          {/* ---------- 2 · Value Creation ---------- */}
          <div className="secthead"><span className="eyebrow">2 · Value Creation</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>Entwickeln</span></div>
          <div className="card">
            <Def t="Drei Reifegrade">
              Jede Beteiligung hat drei Werte auf einer Skala von 0 bis 5. <b>People</b> ist die Qualität des
              Managements, <b>Performance</b> die operative Verfassung (Marge, Investitionen, Working Capital),
              <b> Growth</b> die Fähigkeit zu wachsen. Stufe 2 ist Branchendurchschnitt: dort wächst das Unternehmen
              mit seinem Markt und hält seine Marge. Darüber wird es besser als der Wettbewerb, darunter schlechter.
              Erreichte Stufen bleiben — was ein Programm aufgebaut hat, fällt nicht wieder zurück. Dafür bringt
              jede weitere Stufe über dem Branchenniveau weniger als die davor.
            </Def>
            <Def t="Growth trägt nur, was darunter steht">
              Wachstum wirkt höchstens so weit, wie People und Performance es tragen — konkret bis zum niedrigeren
              der beiden Werte plus eins. Wer den Vertrieb hochfährt, ohne Management und Prozesse mitzuziehen,
              zahlt für Stufen, die nichts bringen, und verliert zusätzlich Marge. Das ist die zentrale Entscheidung
              des Spiels.
            </Def>
            <Def t="Positionen besetzen">
              CEO, CFO und eine branchenspezifische Rolle. Das Rating dieser drei bestimmt, wie schnell und wie
              zuverlässig jedes Programm läuft. Eine Suche dauert ein Halbjahr und kostet 30 % eines Jahresgehalts;
              mehrere Suchen laufen parallel. Eine unbesetzte Stelle spart nichts — sie wird interimistisch besetzt,
              und das ist teurer als eine reguläre Besetzung.
            </Def>
            <Def t="Programme und ihr Risiko">
              Jedes Programm steht je Beteiligung <b>genau einmal</b> zur Verfügung. Über eine Halteperiode
              lassen sich also höchstens vier Performance- und drei Growth-Maßnahmen fahren — die Auswahl
              ist damit eine echte Entscheidung, keine Wiederholung.
              <br /><br />
              <b>Verlässliche</b> Programme liegen im Zugriff des Managements — Kosten senken, Working Capital
              freisetzen, Preise durchsetzen. Sie gelingen in 70–97 % der Fälle, und selbst wenn sie das Ziel
              verfehlen, kommt ein Drittel an. <b>Transformationen</b> wie ERP oder KI sind aufwendig und gehen
              binär aus: 50–90 % je nach Team, ein Fehlschlag bringt nichts außer Kosten. <b>Marktabhängige</b>
              Programme — neuer Markt, Zukauf — hängen an Dritten und gelingen nur in 20–86 % der Fälle.
              Alle drei Spannen hängen fast vollständig am Rating der zuständigen Position.
            </Def>
            <Def t="Assetqualität">
              Eine Note von 0 bis 100, die den Preis beim Verkauf steuert. Sie steigt, wenn das Unternehmen
              schneller wächst als sein Markt und die Marge stabil bleibt, und fällt bei hoher Verschuldung,
              vakanten Positionen oder überdehntem Wachstum.
            </Def>
          </div>

          {/* ---------- 3 · Exit ---------- */}
          <div className="secthead"><span className="eyebrow">3 · Exit</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>Verkaufen</span></div>
          <div className="card">
            <Def t="Vier Wege hinaus">
              <b>Auktion</b> — ein Jahr Vorlauf, dann drei Gebote. Höchster Preis, aber der Markt kann sich in der
              Zwischenzeit drehen. <b>Bilateral</b> — sofort, dafür ein halber Multiple-Punkt Abschlag, kein Risiko.
              <b> GP-led Secondary</b> — 60 % der Beteiligung mit 5 % Abschlag verkaufen und den Rest behalten,
              jedes Halbjahr wiederholbar. <b>IPO</b> — nur bei offenem Börsenfenster, 40 % werden platziert,
              der Rest bleibt ein Jahr gesperrt.
            </Def>
            <Def t="Verhandeln">
              Liegt ein Gebot vor, kannst du annehmen, nachverhandeln oder abbrechen. Nachverhandeln bringt
              meistens mehr, kostet dich aber in einem von vier Fällen den Bieter. Höchstens {MAX_PROC} Prozesse
              laufen gleichzeitig.
            </Def>
            <Def t="Laufzeitende">
              Was nach zehn Jahren noch im Portfolio steht, wird zwangsweise verwertet: 1,5× Abschlag auf das
              Marktmultiple, kein Verhandlungsspielraum, rund 15 % unter Buchwert. Wer rechtzeitig einen Prozess
              startet, bekommt deutlich mehr.
            </Def>
          </div>

          {/* ---------- Wertung ---------- */}
          <div className="secthead"><span className="eyebrow">Wertung</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--gold)" }}>50 % TVPI · 50 % IRR</span></div>
          <div className="card">
            <Def t="Zwei Kennzahlen, je zur Hälfte">
              <b>TVPI</b> misst, wie viel du aus jedem abgerufenen Euro gemacht hast. <b>IRR</b> misst, wie
              schnell er zurückkam. Beide werden gegen den Anspruch eines guten Buyout-Fonds normiert —
              2,00× und 15 % ergeben je einen Punkt. Eine Wertung von 1,00 ist Benchmarkniveau, 1,50 ein
              außergewöhnlicher Jahrgang, unter 0,60 wird das nächste Fundraising schwierig.
            </Def>
            <Def t="Das Exitfenster schließt sich">
              Käufer kennen die Laufzeit deines Fonds. Ab Jahr 8 preisen sie ein, dass du verkaufen musst —
              der erzielbare Multiple sinkt bis zum Laufzeitende um bis zu {LIQ_DISC.toFixed(1).replace(".", ",")} Turns.
              Wer alles bis zum Schluss liegen lässt, verkauft an einen Markt, der das weiß: gemessen 1,02
              Wertung gegen 1,12 bei aktiver Exitsteuerung.
            </Def>
            <Def t="Warum nicht nur der Multiple">
              Weil ein Fonds, der nur auf den Multiple schaut, jedes Asset bis zum Laufzeitende hält — es wird
              ja immer noch ein bisschen mehr. Der IRR bepreist die Zeit und macht aus dem Verkauf wieder eine
              Entscheidung: Ein Unternehmen bei 2,2× nach vier Jahren zu verkaufen ist besser, als bei 2,8×
              nach neun. Umgekehrt schützt der TVPI davor, alles nach drei Jahren wegzuwerfen.
            </Def>
            <Def t="Kapital wird abgerufen, nicht geschenkt">
              Die {eur(CAPITAL)} liegen nicht auf dem Konto, sie sind zugesagt. Abgerufen wird, wenn du kaufst —
              und der IRR läuft ab diesem Tag. Nicht abgerufenes Kapital kostet nichts. Wer spät und gezielt
              investiert, hat es in der Verzinsung leichter, im Multiple aber schwerer.
            </Def>
            <Def t="Bei jedem Exit entscheidest du über die Verwendung">
              Wie viel zurück an die Investoren geht und wie viel im Fonds bleibt, ist deine Entscheidung —
              innerhalb von zwei Schranken: nur bis Jahr 5, und kumuliert höchstens bis zur Höhe des
              Commitments. Danach wird zwingend voll ausgeschüttet.
            </Def>
            <Def t="Einbehalten kauft TVPI mit IRR">
              Bleibt der Erlös im Fonds, arbeitet mehr Kapital je abgerufenem Euro — das hebt den Multiple.
              Es kostet aber systematisch Verzinsung: Ausschütten und später neu abrufen ergibt einen
              Rückfluss heute und einen Abruf morgen, Einbehalten ergibt beides nicht. Der frühere Rückfluss
              gewinnt im IRR immer. Gemessen: durchgehend ausschütten bringt 1,94× bei 17,1 %, durchgehend
              einbehalten 2,20× bei 15,8 %. Beides ist vertretbar — die Frage ist, ob du einen Deal hast,
              der das Geld verdient.
            </Def>
            <Def t="Das Commitment ist eine harte Grenze">
              Mehr als {eur(CAPITAL)} kannst du nicht abrufen. Und die Management Fee liegt innerhalb dieser
              Summe: Über die Laufzeit sind das rund 70 Mio. €, die von Anfang an reserviert werden.
              Investierbar sind ohne Recycling also rund 430 Mio. €, nicht 500. Das angezeigte Dry Powder
              ist bereits um diese Reserve bereinigt.
            </Def>
          </div>

          <div className="card">
            <h3 className="disp">Fondsökonomie</h3>
            <table className="ledger"><tbody>
              <tr><td className="lab">Commitment</td><td style={{ textAlign: "left" }}>{eur(CAPITAL)}, abgerufen bei Bedarf, max. {MAX_SLOTS} Beteiligungen</td></tr>
              <tr><td className="lab">Gebührenreserve</td><td style={{ textAlign: "left" }}>rund 70 Mio. €, vom Dry Powder abgezogen</td></tr>
              <tr><td className="lab">Management Fee</td><td style={{ textAlign: "left" }}>2 % p.a., ab Jahr 6 auf Anschaffungswerte, innerhalb des Commitments</td></tr>
              <tr><td className="lab">Gebührenreserve</td><td style={{ textAlign: "left" }}>rund 70 Mio. €, vom Dry Powder abgezogen</td></tr>
              <tr><td className="lab">Transaktionskosten</td><td style={{ textAlign: "left" }}>2 % beim Kauf, 2–3 % beim Verkauf</td></tr>
              <tr><td className="lab">Carried Interest</td><td style={{ textAlign: "left" }}>20 % über 8 % Hurdle auf die Abrufe</td></tr>
              <tr><td className="lab">Exitfenster</td><td style={{ textAlign: "left" }}>ab Jahr 8 sinkt der erzielbare Preis, bis zu −{LIQ_DISC.toFixed(1).replace(".", ",")}× am Laufzeitende</td></tr>
              <tr><td className="lab">Recycling</td><td style={{ textAlign: "left" }}>frei wählbar bis Jahr 5, kumuliert max. 100 % des Commitments</td></tr>
              <tr><td className="lab">Investitionsperiode</td><td style={{ textAlign: "left" }}>Jahr 1–5</td></tr>
            </tbody></table>
            <p className="hint" style={{ padding: "13px 16px 16px" }}>
              Bewertungskette: EBITDA × Multiple = Unternehmenswert, minus Schulden = Eigenkapitalwert,
              mal deiner Quote = dein Anteil.
            </p>
          </div>

          <div className="card lm">
            <h3 className="disp">Übungsmodus</h3>
            <div className="pad" style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink2)" }}>
              Value Creation einmal an einer einzigen Beteiligung durchspielen — zehn Halbjahre, dieselbe
              Logik wie in der Partie, aber ohne Wettbewerb um Deals und mit eingefrorenen Marktmultiples.
              Was am Ende in der Value Bridge steht, ist ausschließlich deine eigene Arbeit. Ein Coach
              kommentiert jede Periode im Meldungsbereich und erklärt, warum etwas funktioniert hat
              oder eben nicht.
            </div>
            <div className="pad" style={{ paddingTop: 4 }}>
              <button className="solid" style={{ width: "100%", padding: 12 }} onClick={() => setPhase("practice")}>
                Übungsmodus starten
              </button>
            </div>
          </div>

          <div style={{ margin: "18px 16px 40px" }}>
            <button className="solid" style={{ width: "100%", padding: 14 }} onClick={() => setPhase("setup")}>
              Weiter zum Fondsprofil
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "practice") {
    return <PracticeMode dark={dark} setDark={setDark} back={() => setPhase("brief")} />;
  }

  if (phase === "setup") {
    return (
      <div className={"pel" + (dark ? " dark" : "")}><style>{CSS}</style>
        <div className="wrap">
          <div style={{ padding: "36px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="eyebrow">Vintage 2026 · Kohorte 01</div>
              <h1 className="disp" style={{ fontSize: 38, margin: "8px 0 6px" }}>PE-Leagues</h1>
            </div>
            <button className="theme" style={{ borderColor: "var(--rule)", color: "var(--ink)" }}
              onClick={() => setDark(!dark)} aria-label="Darstellung wechseln">{dark ? "☀" : "☾"}</button>
          </div>
          <div style={{ padding: "0 16px" }}>
            <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.55, margin: 0 }}>
              Fünf Fonds, je {eur(CAPITAL)}, zehn Jahre. Ihr bietet auf denselben Dealflow, führt eure Beteiligungen
              und verkauft sie wieder. Gewertet wird zur Hälfte der TVPI, zur Hälfte der IRR — was du verdienst
              und wie lange du dafür brauchst.
            </p>
          </div>
          <div className="card">
            <h3 className="disp">Fondsprofil</h3>
            <div className="pad">
              <p style={{ fontSize: 13, color: "var(--ink2)", margin: "0 0 14px" }}>
                Verteile 12 Punkte. Diese Entscheidung gilt für die gesamte Fondslaufzeit.
              </p>
              {[["sourcing", "Origination", "Proprietärer Dealflow je Halbjahr"],
                ["analysis", "Due Diligence", "Schutz vor Post-Closing-Überraschungen"],
                ["negotiation", "Execution", "Bessere Konditionen bei Kauf und Verkauf"],
                ["operations", "Value Creation", "Wirkung und Tempo der Portfolioarbeit"],
                ["financing", "Financing", "Leverage-Kapazität und Kreditmarge"]].map(([k, n, d]) => (
                <div key={k}>
                  <div className="att">
                    <div className="an">{n}</div>
                    <div className="dots">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button key={i} aria-label={`${n} auf ${i}`}
                          className={"dot" + (attrs[k] >= i ? " f" : "")}
                          onClick={() => setAttrs((a) => { const v = a[k] === i ? i - 1 : i; const nu = used - a[k] + v; return nu <= 12 ? { ...a, [k]: v } : a; })} />
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink2)", marginTop: -6, marginBottom: 10 }}>{d}</div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                <span className="mono" style={{ fontSize: 13, color: used === 12 ? "var(--teal)" : "var(--ox)" }}>
                  {used} / 12 Punkte
                </span>
                <button className="solid" disabled={used !== 12} onClick={start}>Fonds auflegen</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dpi = me ? dpiOf(me, market, quarter) : 0;
  const gross = me ? grossMoicOf(me, market) : 0;
  const tvpi = me ? tvpiOf(me, market, quarter) : 1;
  const irr = me ? irrOf(me, market, quarter) : 0;
  const score = me ? scoreOf(me, market, quarter) : 0;
  const myRank = rank.findIndex((f) => f.me) + 1;

  return (
    <div className={"pel" + (dark ? " dark" : "")}><style>{CSS}</style>
      <div className="bar">
        {/* Drei Kennzahlen, mehr braucht die Leiste nicht: Wertung, verfügbares
            Kapital, verbleibende Zeit. Alles Weitere steht dort, wo es gebraucht wird. */}
        <div className="barrow">
          <div>
            <div className="stat">Wertung</div>
            <AnimatedNumber className="statv mono" value={score} format={(v) => v.toFixed(2)} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="stat">Dry Powder</div>
            <AnimatedNumber className="statv mono" value={investableOf(me, quarter)} format={eur} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="stat">Halbjahr</div>
            <div className="statv mono">{quarter}<span style={{ opacity: .5 }}>/{PERIODS}</span></div>
          </div>
          <button className="theme" onClick={() => { haptic(6); setDark(!dark); }} aria-label="Darstellung wechseln">
            {dark ? "☀" : "☾"}
          </button>
        </div>
        <div className="barrow" style={{ marginTop: 6, fontSize: 10.5, opacity: .55 }}>
          <span className="mono">TVPI {tvpi.toFixed(2)}× · IRR {(irr * 100).toFixed(1).replace(".", ",")} % · DPI {dpi.toFixed(2)}×</span>
          <span className="mono">Platz {myRank}/{funds.length}{streak >= 2 ? ` · 🔥×${streak}` : ""} · {me.holdings.length}/{MAX_SLOTS} PortCos</span>
        </div>
        <div className="barrow" style={{ marginTop: 2, fontSize: 10.5, opacity: .45 }}>
          <span className="mono">
            {eur(me.undrawn ?? CAPITAL)} offenes Commitment{(me.recyc || 0) > 0.5 ? ` + ${eur(me.recyc)} einbehalten` : ""}
            {" "}− {eur(feeReserveOf(me, quarter))} Gebührenreserve
          </span>
          {(me.accrued || 0) > 0.5 && <span className="mono ox">{eur(me.accrued)} aufgelaufene Gebühren</span>}
        </div>
        <div className="prog"><i style={{ width: `${(quarter / PERIODS) * 100}%` }} /></div>
      </div>

      <Toasts items={toasts} />
      {burst > 0 && <Confetti key={burst} seed={burst} />}
      {rolling && (
        <div className="rollmask">
          <div className="rr" />
          <div className="rt">Auktion läuft …</div>
          <div className="rs">Gebote werden aufgelöst</div>
        </div>
      )}

      <div className="wrap">
        <News feed={feed} quarter={quarter} />
        {phase === "end" && (
          <div className="tomb">
            <div className="sub">Fondslaufzeit beendet</div>
            <div className="amt">{score.toFixed(2)}</div>
            <div className="sub">Wertung · Platz {myRank} von 5</div>
            <div className="sub" style={{ marginTop: 6 }}>
              TVPI {tvpi.toFixed(2)}× · IRR {(irr * 100).toFixed(1).replace(".", ",")} % · DPI {dpi.toFixed(2)}× · Brutto-MOIC {gross.toFixed(2)}×
            </div>
            <div className="sub" style={{ marginTop: 4, opacity: .7 }}>
              {eur(me.drawn || 0)} von {eur(CAPITAL)} abgerufen · {eur(me.distTotal || 0)} ausgeschüttet
            </div>
          </div>
        )}

        {tab === "deals" && (
          <>
            {landmark && quarter >= LM_ANNOUNCE && quarter < LM_DEAL && (
              <div className={"card lm" + (quarter === LM_ANNOUNCE ? " fresh" : "")}>
                <h3 className="disp">{landmark.name}</h3>
                <div className="pad">
                  <span className="tag prop">Trophy Asset</span>
                  <span className="tag"><i className="sdot" style={{ background: SECCOLOR[landmark.sector] }} />{landmark.sector}</span>
                  <p className="biz">{landmark.desc}</p>
                  <table className="ledger" style={{ marginTop: 10 }}><tbody>
                    <tr><td className="lab">Umsatz</td><td>{eur(landmark.revenue)}</td></tr>
                    <tr><td className="lab">Kennzahlen</td><td>Erst mit dem Datenraum</td></tr>
                    <tr><td className="lab">Am Markt in</td><td>{hj(LM_DEAL - quarter)}</td></tr>
                  </tbody></table>
                  <p style={{ fontSize: 12, color: "var(--gold)", marginTop: 10, marginBottom: 0 }}>
                    Der größte Prozess des Zyklus. Alle fünf Fonds der Kohorte bieten mit — wer sein Kapital vorher bindet, ist raus.
                  </p>
                </div>
              </div>
            )}
            {deals.map((d) => <DealCard key={d.id} d={d} me={me} bid={bids[d.id]} dd={!!dd[d.id]} onDD={() => runDD(d.id)}
                  ddUsed={Object.keys(dd).length} ddCap={ddCapOf(me.attrs.analysis)} quarter={quarter}
              setBid={(b) => setBids((p) => ({ ...p, [d.id]: b }))} clear={() => setBids((p) => { const n = { ...p }; delete n[d.id]; return n; })} market={market} />)}
            <div className="card">
              <h3 className="disp">Archiv</h3>
              {feed.filter((f) => f.q < quarter).length === 0 && <div className="quiet">Noch keine älteren Meldungen.</div>}
              {feed.filter((f) => f.q < quarter).slice(0, 15).map((f, i) => (
                <div className={"item " + (f.tone || "neu")} key={i}>
                  <span className="em">{f.e || "·"}</span>
                  <span dangerouslySetInnerHTML={{ __html: `<span class="mono" style="opacity:.5">HJ ${f.q}</span> ${f.t}` }} />
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "port" && (
          <>
            <div className="card">
              <h3 className="disp">Wertung gegen die Kohorte</h3>
              <TvpiChart hist={tvpiHist} meIdx={0} />
            </div>
            <div className="card">
              <h3 className="disp">Sektoren nach NAV</h3>
              <SectorSplit holdings={me.holdings} market={market} cash={me.cash} />
            </div>
            {me.holdings.length === 0 && (
              <div className="card"><div className="pad" style={{ paddingTop: 14, fontSize: 13, color: "var(--ink2)" }}>
                Noch keine Beteiligungen. Im Dealflow findest du vier strukturierte Prozesse und deine proprietären Kontakte.
              </div></div>
            )}
            {me.holdings.length > 0 && (
              <div className="secthead">
                <span className="eyebrow">Beteiligungen</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--ox)" }}>
                  {me.holdings.filter((c) => healthOf(c, market).attention).length > 0
                    ? `${me.holdings.filter((c) => healthOf(c, market).attention).length} × Handlungsbedarf` : ""}
                </span>
              </div>
            )}
            <Shelf holdings={me.holdings} market={market} cash={me.cash} quarter={quarter}
              onPick={(uid) => { haptic(6); const el = document.getElementById("h_" + uid); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
            {me.holdings.map((c) => (
              <Holding key={c.uid} c={c} market={market} neg={NEG} quarter={quarter} procCount={procCount}
                freeSlots={freeSlots} act={{
                  proc: () => previewExit(c, "proc"), bil: () => previewExit(c, "bil"),
                  cv: () => previewExit(c, "cv"), ipo: () => previewExit(c, "ipo"),
                  search: (seat) => startSearch(c, seat), init: (dim) => setInitPick({ uid: c.uid, dim }), ltip: () => toggleLtip(c),
                  study: c.dd ? null : () => runStudy(c.uid),
                }} />
            ))}
            {me.realized.length > 0 && (
              <div className="card">
                <h3 className="disp">Track Record</h3>
                {me.realized.map((r, i) => (
                  <div className="lb" key={i}>
                    <span className="nm">{r.name}</span>
                    <span className="mo" style={{ color: r.moic >= 1 ? "var(--teal)" : "var(--ox)" }}>{r.moic.toFixed(2)}×</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "rank" && (
          <>
            <div className="card">
              <h3 className="disp">Peer Group</h3>
              {rank.map((f, i) => (
                <div key={f.id}>
                  <div className={"lb" + (f.me ? " me" : "")} onClick={() => setOpenFund(openFund === f.id ? null : f.id)}
                    style={{ cursor: "pointer" }} role="button" tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setOpenFund(openFund === f.id ? null : f.id)}>
                    <span className="rk">{["🥇", "🥈", "🥉"][i] || i + 1}</span>
                    <span className="nm">{f.name}</span>
                    <span className="bar2"><i style={{ width: `${clamp((f.score + 0.2) / 2.0, 0.04, 1) * 100}%` }} /></span>
                    <span className="mo" style={{ color: f.score >= 1 ? "var(--teal)" : "var(--ox)" }}>{f.score.toFixed(2)}</span>
                    <span style={{ color: "var(--ink2)", fontSize: 11 }}>{openFund === f.id ? "▴" : "▾"}</span>
                  </div>
                  {openFund === f.id && (
                    <div style={{ background: "var(--zebra)", borderBottom: "1px solid var(--rule)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px 2px" }}>
                        <span className="eyebrow">{f.me ? "Dein Portfolio" : f.arch.style}</span>
                        <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>
                          TVPI {f.tvpi.toFixed(2)}× · IRR {(f.irr * 100).toFixed(1).replace(".", ",")} % · DPI {f.dpi.toFixed(2)}× · {eur(f.cash)} frei
                        </span>
                      </div>
                      {f.holdings.length === 0 && <div className="quiet" style={{ paddingTop: 4 }}>Keine Beteiligungen.</div>}
                      {f.holdings.map((c) => {
                        const val = fairOf(c, market, f.attrs.negotiation);
                        const mo = val / c.entryEquity;
                        return (
                          <div key={c.uid} style={{ padding: "6px 14px", fontSize: 12.5, display: "flex", gap: 8, alignItems: "baseline" }}>
                            <i className="sdot" style={{ background: SECCOLOR[c.sector] }} />
                            <span style={{ flex: 1 }}>{c.name}</span>
                            <span className="mono" style={{ color: "var(--ink2)" }}>Kauf {x(c.entryMult)}</span>
                            <span className="mono" style={{ color: "var(--ink2)" }}>{c.holdQ} HJ</span>
                            <span className="mono" style={{ color: mo >= 1 ? "var(--teal)" : "var(--ox)", minWidth: 42, textAlign: "right" }}>
                              {mo.toFixed(2)}×
                            </span>
                          </div>
                        );
                      })}
                      {f.realized.length > 0 && (
                        <div style={{ padding: "6px 14px 10px", fontSize: 12, color: "var(--ink2)" }}>
                          Realisiert: {f.realized.map((r) => `${r.name} ${r.moic.toFixed(2)}×`).join(" · ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="card">
              <h3 className="disp">EV/EBITDA je Sektor</h3>
              <MarketChart hist={marketHist} />
              <table className="ledger"><tbody>
                {SECNAMES.map((s) => {
                  const d = (market[s] / SECTORS[s].m - 1) * 100;
                  return (
                    <tr key={s}>
                      <td className="lab"><i className="sdot" style={{ background: SECCOLOR[s] }} />{s}</td>
                      <td>{x(market[s])}
                        <span style={{ color: d >= 0 ? "var(--teal)" : "var(--ox)", fontSize: 11 }}>
                          {" "}{d >= 0 ? "▲" : "▼"} {Math.abs(Math.round(d))} %
                        </span></td>
                    </tr>
                  );
                })}
              </tbody></table>
            </div>
          </>
        )}

        {phase === "play" && (
          <div style={{ margin: "18px 16px 8px" }}>
            <button className={"solid cta-big" + (Object.keys(bids).length > 0 ? " ready" : "")}
              style={{ width: "100%", padding: 14 }} disabled={rolling} onClick={closeQuarter}>
              {rolling ? "Läuft …" : <>Halbjahr abschließen {Object.keys(bids).length > 0 && `· ${gebote(Object.keys(bids).length)}`}</>}
            </button>
          </div>
        )}
      </div>

      <div className="tabs">
        <div className="tabinner">
          <span className="ind" style={{ transform: `translateX(${TAB_IDX[tab] * 100}%)` }} />
          {[["deals", "Dealflow"], ["port", "Portfolio"], ["rank", "Peer Group"]].map(([k, n]) => {
            const Icon = TAB_ICON[k];
            return (
              <button key={k} className={tab === k ? "on" : ""} onClick={() => { if (tab !== k) haptic(6); setTab(k); }}>
                <Icon strokeWidth={tab === k ? 2.2 : 1.7} />
                {n}
                {k === "port" && shortlist.length + exitQueue.length > 0 && (
                  <span className="badge">{shortlist.length + exitQueue.length}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {sheet && <Sheet sheet={sheet} close={() => setSheet(null)} onConfirm={confirmExit} />}
      {useProceeds && (
        <UseProceeds item={useProceeds} me={me} quarter={quarter}
          settle={(keep) => settle(useProceeds.c, useProceeds.gross, useProceeds.buyer,
            useProceeds.feeRate, useProceeds.extra, keep)} />
      )}
      {initPick && me.holdings.find((h) => h.uid === initPick.uid) && (
        <InitPicker c={me.holdings.find((h) => h.uid === initPick.uid)} dim={initPick.dim} market={market}
          start={(id) => { startInit(me.holdings.find((h) => h.uid === initPick.uid), initPick.dim, id); setInitPick(null); }}
          close={() => setInitPick(null)} />
      )}
      {!sheet && !initPick && shortlist.length > 0 && (
        <Shortlist item={shortlist[0]} holding={me.holdings.find((h) => h.uid === shortlist[0].uid)}
          analysis={me.attrs.analysis} hire={hire} reject={rejectAll} />
      )}
      {!sheet && !initPick && shortlist.length === 0 && exitQueue.length > 0 && (
        <Offers item={exitQueue[0]} holding={me.holdings.find((h) => h.uid === exitQueue[0].uid)}
          market={market} neg={NEG} decide={decideOffer} />
      )}
    </div>
  );
}

/* ---------------- Teilkomponenten ---------------- */

function News({ feed, quarter, practice }) {
  const last = feed.filter((f) => f.q === quarter);
  return (
    <div className="news">
      <div className="nh">
        <span className="eyebrow">Meldungen aus Halbjahr {quarter}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>{last.length}</span>
      </div>
      {last.length === 0 ? (
        <div className="quiet">{practice ? "Ruhiges Halbjahr. Setz eine Maßnahme auf oder schließ es ab." : "Ruhiges Halbjahr. Gib Gebote ab und schließe es ab."}</div>
      ) : (
        last.map((f, i) => (
          <div className={"item " + (f.tone || "neu")} key={i} style={{ animationDelay: `${i * 60}ms` }}>
            <span className="em">{f.e || "·"}</span>
            <span dangerouslySetInnerHTML={{ __html: f.t }} />
          </div>
        ))
      )}
    </div>
  );
}

const q4 = (v) => Math.round(v * 4) / 4;   // auf Viertelschritte runden


/* ---------- Geführter Durchlauf ----------
   Der Übungsmodus war bisher ein Operating-Trainer: eine fertig gekaufte
   Beteiligung, zehn Halbjahre, Exit am Ende. Kauf und Verkauf, also die beiden
   Entscheidungen, an denen sich eine Partie tatsächlich entscheidet, kamen
   nicht vor. Jetzt läuft der ganze Zyklus einmal durch — Dealflow, Prüfung,
   Gebot, Wertsteigerung, Verkaufsprozess, Verwendung des Erlöses — und jeder
   Schritt wird erklärt, bevor er verlangt wird.                              */
const CoachCtx = React.createContext(null);

function Coach({ eyebrow, title, children, step, total }) {
  return (
    <div className="coach">
      <div className="ceyebrow">{eyebrow}</div>
      <h4 className="disp">{title}</h4>
      {children}
      {total > 0 && (
        <div className="stepdots" aria-label={`Schritt ${step} von ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <i key={i} className={i + 1 === step ? "on" : i + 1 < step ? "done" : ""} />
          ))}
        </div>
      )}
    </div>
  );
}
// Kennzahlenerklärung im Rahmen: Begriff, dann was er aussagt
const Kpi = ({ t, children }) => <><dt>{t}</dt><dd>{children}</dd></>;

function DealCard({ d, me, bid, dd, onDD, setBid, clear, market, ddUsed, ddCap, quarter }) {
  const ask = q4(d.askMult);
  const reserve = d.askMult * (d.type === "prop" ? RESERVE_PROP : RESERVE_PROC);
  const [mult, setMult] = useState(ask);
  const [lev, setLev] = useState(q4(Math.min(d.levCap, 3.5)));
  const eb = ebitdaOf(d);
  // Das Equity Ticket enthält die Transaktionskosten — sonst wird ein Gebot an der
  // Liquiditätsgrenze angeboten und fällt beim Auktionsschluss stillschweigend raus.
  const eq = eb * mult - eb * lev + eb * mult * ENTRY_FEE;
  const rateA = BASE_RATE - 0.25 * me.attrs.financing + Math.max(0, lev - LEV_FREE) * LEV_STEP;
  /* Cash-Sicht auf Jahresbasis, vor Zinsen und Steuern: eine Eigenschaft des
     Unternehmens, nicht der Finanzierung. So bleibt sie zwischen Zielen
     vergleichbar, egal mit welchem Leverage man rechnet.                     */
  const capexA = (d.revenue * d.capexPct) / 100;
  const nwcA = (d.nwcPct / 100) * (d.revenue * d.growth / 100);
  const conv = eb > 0 ? ((eb - capexA - nwcA) / eb) * 100 : 0;
  const afford = eq <= investableOf(me, quarter) && me.holdings.length < MAX_SLOTS;
  const lm = d.type === "landmark";
  const hidden = d.type === "prop" && me.attrs.analysis < 4 && !dd;
  const flagHidden = !dd && me.attrs.analysis < 3;
  /* Branchenreferenzen — Benchmarkmarge und Marktwachstum — gibt es ausschließlich
     mit Due Diligence. Ohne sie kennt man die absoluten Zahlen des Targets, kann
     sie aber nicht einordnen: weder ob in der Marge noch Luft ist, noch ob das
     Unternehmen schneller oder langsamer wächst als sein Markt.               */
  const bench = dd;
  /* Erwartete Performance gegenüber dem Markt: Wächst das Unternehmen dauerhaft
     schneller oder langsamer als sein Sektor — gewinnt es also Marktanteile oder
     verliert es welche? Die Schätzung kommt ausschließlich aus dem Datenraum und
     bleibt auch dann eine Schätzung; Analyse verkleinert das Band, schließt es
     aber nie. Gegenstück ist die Zeile darüber: die schaut zurück, diese nach
     vorn.                                                                     */
  const spot = useContext(CoachCtx);
  const sp = (k) => (spot === k ? " spot" : "");
  const ddCost = ddCostOf(d);
  const ddFull = !dd && ddUsed >= ddCap;
  const dEst = dd ? driftEstOf(d, me.attrs.analysis) : null;
  const dBand = driftBandOf(me.attrs.analysis);
  const gapM = d.margin - d.benchMargin;
  const gapG = d.growth - SECTORS[d.sector].g;
  const cap = d.levCap + 0.3 * me.attrs.financing;

  return (
    <div className={"card st" + (lm ? " lm" : "")} style={{ "--sec": SECCOLOR[d.sector] }}>
      <h3 className="disp">{lm ? "🏛️ " : ""}{d.name}</h3>
      <div className="pad" style={{ paddingBottom: 8 }}>
        <span className={"tag" + (d.type !== "process" ? " prop" : "")}>
          {lm ? "Trophy Asset" : d.type === "prop" ? "🤝 Proprietär (Off-Market)" : "📄 Strukturierter Prozess"}
        </span>
        <span className="tag"><i className="sdot" style={{ background: SECCOLOR[d.sector] }} />{d.sector}</span>
        {d.flag && !flagHidden && (isAngle(d.flag)
          ? <span className="tag prop">◆ {d.flag}</span>
          : <span className="tag flag">⚑ {d.flag}</span>)}
        {d.flag && flagHidden && <span className="tag">⚑ ?</span>}
        <p className="biz">{d.desc}</p>
      </div>
      <table className="ledger"><tbody>
        <tr><td className="lab">Umsatz</td><td>{eur(d.revenue)}</td></tr>
        <tr><td className="lab">EBITDA-Marge</td><td>{hidden ? "—" : pct(d.margin)}
          {!hidden && (bench
            ? <span style={{ color: gapM >= 0 ? "var(--teal)" : "var(--ox)", fontSize: 11 }}>
                {" "}{gapM >= 0 ? "+" : "−"}{Math.abs(gapM).toFixed(1).replace(".", ",")} pp</span>
            : <span style={{ color: "var(--ink2)", fontSize: 11 }}>{" "}?</span>)}</td></tr>
        <tr><td className="lab">EBITDA</td><td>{hidden ? "—" : eur(eb)}</td></tr>
        <tr><td className="lab">EBITDA − Capex</td><td>{hidden ? "—" : eur(eb - capexA)}</td></tr>
        <tr><td className="lab">Umsatzwachstum bisher</td><td>{pct(d.growth)}
          {bench
            ? <span style={{ color: gapG >= 0 ? "var(--teal)" : "var(--ox)", fontSize: 11 }}>
                {" "}{gapG >= 0 ? "+" : "−"}{Math.abs(gapG).toFixed(1).replace(".", ",")} pp</span>
            : <span style={{ color: "var(--ink2)", fontSize: 11 }}>{" "}?</span>}</td></tr>
        <tr><td className="lab">Erwartete Performance vs. Markt</td><td>
          {dd
            ? <span style={{ color: dEst >= 0 ? "var(--teal)" : "var(--ox)" }}>
                {dEst >= 0 ? "+" : "−"}{Math.abs(dEst).toFixed(1).replace(".", ",")}
                <span style={{ color: "var(--ink2)", fontSize: 11 }}>
                  {" "}± {dBand.toFixed(1).replace(".", ",")} pp p.a.
                </span>
              </span>
            : <span style={{ color: "var(--ink2)" }}>— <span style={{ fontSize: 11 }}>nur mit Datenraum</span></span>}
        </td></tr>
        <tr><td className="lab">Preiserwartung</td><td>{x(d.askMult)}</td></tr>
        <tr><td className="lab">EV/EBITDA Sektor</td><td>{x(market[d.sector])}</td></tr>
        <tr><td className="lab">Assetqualität</td><td>{hidden ? "—" : Math.round(d.quality)}</td></tr>
      </tbody></table>
      <div className="pad" style={{ paddingTop: 12 }}>
        {dd ? (
          <p className="hint teal">🔍 Due Diligence abgeschlossen</p>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <button onClick={onDD} className={sp("dd").trim()}
              disabled={investableOf(me, quarter) < ddCost || ddFull} style={{ width: "100%" }}>
              {ddFull ? `🔍 Deal-Team ausgelastet · ${ddUsed}/${ddCap} Prozesse`
                : `🔍 Due Diligence · ${eur(ddCost)}`}
            </button>
            <p className={"hint" + (hidden || flagHidden ? " ox" : "")} style={{ marginTop: 6 }}>
              {hidden ? "Ohne DD kein Datenraum — du kaufst auf Umsatz und Bauchgefühl."
                : flagHidden ? "Flagge ungeprüft, Branchenreferenz und erwartete Performance vs. Markt fehlen."
                : ddFull ? `Bei Analysefähigkeit ${me.attrs.analysis} laufen höchstens ${ddCap} Datenräume gleichzeitig. Ein Prozess müsste abgebrochen werden.`
                : `Branchenreferenz, Schätzung der erwarteten Performance gegenüber dem Markt (± ${dBand.toFixed(1).replace(".", ",")} pp) und kein Post-Closing-Risiko. Fällig sofort — auch wenn du den Deal nicht bekommst.`}
            </p>
          </div>
        )}
        <div className="slrow"><span>Indikatives Angebot</span>
          <span className="slval" style={{ color: mult < reserve ? "var(--ox)" : "var(--ink)" }}>{x(mult)} EBITDA</span></div>
        <input type="range" min={q4(Math.max(3, reserve - 0.5))} max={q4(d.askMult + 4)} step={0.25} value={mult} onChange={(e) => setMult(+e.target.value)} />
        <p className={"hint" + (mult < reserve ? " ox" : "")} style={{ margin: "2px 0 0" }}>
          {mult < reserve
            ? `Unter der Schmerzgrenze des Verkäufers (rund ${x(reserve)}) — er zieht das Objekt zurück.`
            : d.type === "prop"
              ? `Off-Market. Der Gesellschafter verkauft nicht unter rund ${x(reserve)}, andere Fonds sitzen selten mit am Tisch.`
              : `Auktion. Reservationspreis rund ${x(reserve)}, die Kohorte bietet mit.`}
        </p>
        <div className="slrow" style={{ marginTop: 8 }}><span>Leverage bei Closing</span>
          <span className="slval">{x(lev)} · {pct(rateA)} · Cov {x(Math.max(COV_FLOOR, lev + COV_HEADROOM + 0.10 * me.attrs.financing))}</span></div>
        <input type="range" min={0} max={q4(cap)} step={0.25} value={lev} onChange={(e) => setLev(+e.target.value)} />
        <table className="ledger" style={{ marginTop: 10 }}><tbody>
          <tr><td className="lab">Enterprise Value</td><td>{hidden ? "≈ " + eur(eb * mult) : eur(eb * mult)}</td></tr>
          <tr><td className="lab">Equity Ticket</td><td style={{ color: afford ? "var(--ink)" : "var(--ox)" }}>{eur(eq)}</td></tr>
          <tr><td className="lab">Cash Conversion</td>
            <td style={{ color: hidden ? "var(--ink2)" : conv >= 60 ? "var(--teal)" : conv >= 35 ? "var(--ink)" : "var(--ox)" }}>
              {hidden ? "—" : pct(conv)}
              <span style={{ fontSize: 11, color: "var(--ink2)" }}> vor Zins und Steuern</span></td></tr>
        </tbody></table>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {bid ? (
            <button className="ox" style={{ flex: 1 }} onClick={() => { haptic(10); clear(); }}>Angebot zurückziehen</button>
          ) : (
            <button className={"solid" + sp("bid")} style={{ flex: 1 }} disabled={!afford} onClick={() => { haptic(10); setBid({ mult, lev }); }}>
              {!afford ? (me.holdings.length >= MAX_SLOTS ? "Portfolio voll" : "Dry Powder reicht nicht")
                : mult < reserve ? "Angebot abgeben — vermutlich zu niedrig" : "Angebot abgeben"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Holding({ c, market, neg, quarter, procCount, freeSlots, act, practice }) {
  const spot = useContext(CoachCtx);
  const sp = (k) => (spot === k ? " spot" : "");
  const health = healthOf(c, market);
  const cf = c.cf;
  const lev = c.netDebt / Math.max(0.5, ebitdaOf(c));
  /* Cash Conversion vor Zinsen und Steuern: (EBITDA − Capex − ΔNWC) / EBITDA.
     Sie misst das Unternehmen, nicht die Kapitalstruktur — deshalb bleibt der
     Zins draußen und die Kennzahl ist mit jedem Ziel im Dealflow vergleichbar. */
  const conv = cf && cf.eb > 0 ? ((cf.eb - cf.capex - cf.nwc) / cf.eb) * 100 : null;
  const eb = ebitdaOf(c);
  const val = navValueOf(c, market);
  const real = fairOf(c, market, neg);
  const m = val / c.entryEquity;
  const out = c.cashOut || 0;
  const cost = c.costTotal ?? c.entryEquity;
  const mTot = (val + out) / cost;
  const st = c.st ?? 1;
  const blocked = c.block > quarter;
  const inProc = !!c.proc;
  const locked = !!c.lockUntil;
  const ripe = c.holdQ >= MIN_HOLD && !locked;
  const canProc = ripe && !inProc && !blocked;      // Prozess: gesperrt nach Abbruch
  const canNow = ripe && !inProc;                   // Bilateral und CV: jedes Halbjahr erneut
  const ipoOpen = canNow && st === 1 && market[c.sector] >= SECTORS[c.sector].m * 1.05 && eb >= IPO_EBITDA;

  return (
    <div className={"card st" + (inProc ? " lm" : "")} id={"h_" + c.uid} style={{ "--sec": SECCOLOR[c.sector] }}>
      <div className="hhead">
        <h3 className="disp" style={{ padding: 0 }}>{c.cv ? "🔄 " : ""}{c.name}</h3>
        <span className={"flagpill" + (health.attention ? " att" : "")}>
          {health.attention ? "◉ Needs attention" : "○ On track"}
        </span>
      </div>

      <div className="pad" style={{ paddingBottom: 8 }}>
        <span className="tag"><i className="sdot" style={{ background: SECCOLOR[c.sector] }} />{c.sector}</span>
        <span className="tag">⏱ {c.holdQ} HJ gehalten</span>
        {st < 1 && <span className="tag prop">{Math.round(st * 100)} % Anteil</span>}
        {c.flag && (isAngle(c.flag)
          ? <span className="tag prop">◆ {c.flag}</span>
          : <span className="tag flag">⚑ {c.flag}</span>)}
        <p className="biz">{c.desc}</p>
      </div>
      {/* Jede Größe steht neben ihrer Referenz, immer in derselben Spaltenlogik:
          Ist — eigene Entwicklung — Branchenreferenz. Vorher hingen Benchmark und
          Marktwachstum als Zusätze in der Wertspalte und brachen dort um.        */}
      <div className="kpis">
        <div className="krow">
          <div>
            <div className="eyebrow">Umsatz</div>
            <div className="mono kv">{eur(c.revenue)}</div>
          </div>
          <div>
            <div className="eyebrow">Wachstum</div>
            <div className="mono kv" style={{ color: !c.dd || cagrOf(c) == null ? "var(--ink)" : cagrPrem(c) >= 0 ? "var(--teal)" : "var(--ox)" }}>
              {cagrOf(c) == null ? "—" : pctS(cagrOf(c))}
            </div>
          </div>
          <div>
            <div className="eyebrow">Markt</div>
            <div className="mono kv" style={{ color: "var(--ink2)" }}>{c.dd ? pctS(SECTORS[c.sector].g) : "—"}</div>
          </div>
        </div>
        <div className="krow">
          <div>
            <div className="eyebrow">EBITDA</div>
            <div className="mono kv">{eur(eb)}</div>
          </div>
          <div>
            <div className="eyebrow">Marge</div>
            <div className="mono kv" style={{ color: !c.dd ? "var(--ink)" : c.margin >= c.benchMargin ? "var(--teal)" : "var(--ox)" }}>
              {pct(c.margin)}
            </div>
          </div>
          <div>
            <div className="eyebrow">Benchmark</div>
            <div className="mono kv" style={{ color: "var(--ink2)" }}>{c.dd ? pct(c.benchMargin) : "—"}</div>
          </div>
        </div>
        {/* Cash-Sicht vor Finanzierung: was nach Investitionen und Working Capital
            vom EBITDA übrig bleibt. Der Zins steht daneben beim Leverage.      */}
        <div className="krow">
          <div>
            <div className="eyebrow">EBITDA − Capex</div>
            <div className="mono kv">{cf ? eur(cf.eb - cf.capex) : "—"}</div>
          </div>
          <div>
            <div className="eyebrow">Cash Conversion</div>
            <div className="mono kv" style={{ color: conv == null ? "var(--ink)" : conv >= 60 ? "var(--teal)" : conv >= 35 ? "var(--ink)" : "var(--ox)" }}>
              {conv == null ? "—" : pct(conv)}
            </div>
          </div>
          <div>
            <div className="eyebrow">Leverage</div>
            <div className="mono kv" style={{ color: lev > (c.covLimit ?? 6.5) ? "var(--ox)" : "var(--ink)" }}>
              {x(lev)}
              <span style={{ display: "block", fontSize: 10, color: "var(--ink2)", fontWeight: 400, marginTop: 2 }}>
                Cov {x(c.covLimit ?? 6.5)} · {pct(cf ? cf.rate : c.rate)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <table className="ledger"><tbody>
        <tr><td className="lab">Assetqualität</td><td>{Math.round(c.quality)}
          {c.entryQuality != null && <span style={{ color: c.quality >= c.entryQuality ? "var(--teal)" : "var(--ox)", fontSize: 11 }}>
            {" "}{c.quality >= c.entryQuality ? "+" : "−"}{Math.abs(Math.round(c.quality - c.entryQuality))}</span>}</td></tr>
        <tr><td className="lab">Enterprise Value</td>
          <td>{eur(evOf(c, markMultiple(c, market)))} <span style={{ fontSize: 11, color: "var(--ink2)" }}>bei {x(markMultiple(c, market))}</span></td></tr>
        <tr><td className="lab">Total Value</td>
          <td style={{ color: mTot >= 1 ? "var(--teal)" : "var(--ox)", fontWeight: 600 }}>
            {eur(val + out)} <span style={{ fontSize: 11, fontWeight: 400 }}>· {mTot.toFixed(2)}×</span>
            {out > 0.5 && <span style={{ fontSize: 11, color: "var(--ink2)", fontWeight: 400 }}> inkl. {eur(out)}</span>}</td></tr>
      </tbody></table>
      <Stages c={c} compact={quarter} />
      <Track c={c} />
      <div className="pad" style={{ paddingTop: 12 }}>
        <div className="seats">
          {[["ceo", "CEO"], ["cfo", "CFO"], ["r3", ROLE3[c.sector].n]].map(([k, nm]) => {
            const sk = c[k].skill, se = (c.searches || []).find((z) => z.seat === k);
            const searching = !!se, eb = ebitdaOf(c);
            return (
              <button key={k} className={"seat" + (sk <= 0 ? " vac pulse" : "") + (searching ? " busy" : "")}
                className={(k === "cfo" ? sp("hire") : "").trim()}
                disabled={searching} onClick={() => { haptic(8); act.search(k); }}>
                <div className="rn">{nm}</div>
                <div className="sk">{searching ? "🔍" : sk > 0 ? sk.toFixed(1) : "—"}</div>
                <div className="rn">{searching ? (se.waiting ? "Shortlist" : "läuft") : sk <= 0 ? "vakant"
                  : isCapped(c, k) ? `wirkt ${cappedSkill(c, k).toFixed(1)}` : eur(payOf(k, sk, eb))}</div>
              </button>
            );
          })}
        </div>
        {!c.dd && act.study && (
          <div style={{ padding: "10px 14px 0" }}>
            <button className={sp("study").trim()} style={{ width: "100%" }} onClick={() => { haptic(8); act.study(); }}>
              📊 Benchmarkstudie · {eur(DD_COST / 2)}
            </button>
            <p className="hint ox" style={{ marginTop: 6 }}>Branchenreferenz fehlt — ohne sie sind Marge und Wachstum nicht einzuordnen.</p>
          </div>
        )}
        <p className="hint" style={{ padding: "4px 15px 0" }}>
          Tippen startet ein Search-Mandat · Retainer 30 % eines Jahresgehalts · ein Halbjahr
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className={sp("plat").trim()} style={{ flex: 1 }} disabled={!!c.initP || freeSlots <= 0} onClick={() => act.init("plat")}>
            🏗 Performance
          </button>
          <button className={sp("acc").trim()} style={{ flex: 1 }} disabled={!!c.initA || freeSlots <= 0} onClick={() => act.init("acc")}>
            🚀 Growth
          </button>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--ink2)", marginTop: 6, lineHeight: 1.45 }}>
          {initsOf(c).length
            ? initsOf(c).map((I) => `${I.name || "Maßnahme"} läuft, Ergebnis in ${hj(I.doneQ - quarter)}.${I.drag ? ` Belastet die Marge um ${I.drag.toFixed(1).replace(".", ",")} pp.` : ""}`).join(" ")
              + (freeSlots > 0 && initsOf(c).length === 1 ? " Die zweite Werkbank ist frei." : "")
            : freeSlots <= 0 ? "Operating-Kapazität im Portfolio ausgeschöpft."
            : `Performance und Growth laufen parallel. Maßnahmen lassen sich wiederholen — jede weitere Auflage bringt weniger und dauert länger, und ob überhaupt noch etwas zu holen ist, steht als Eignung im Katalog.${(c.done || []).length ? ` Bisher ${(c.done || []).length} Programme abgeschlossen.` : ""}`}
        </div>
        {!c.ltip && (
          <button className={sp("ltip").trim()} style={{ width: "100%", marginTop: 8 }} onClick={act.ltip}>
            📜 MEP aufsetzen · {Math.round(LTIP_SHARE * 100)} % Sweet Equity
          </button>
        )}
        {c.ltip && <div style={{ fontSize: 11, color: "var(--gold)", marginTop: 8 }}>
          📜 MEP aktiv · {Math.round(LTIP_SHARE * 100)} % Sweet Equity
        </div>}

        {inProc && (
          <div style={{ marginTop: 14, padding: "10px 12px", border: "1px solid var(--gold)", fontSize: 12.5, lineHeight: 1.5 }}>
            📣 <b>Verkaufsprozess läuft.</b> Gebote in {hj(c.proc.resolveQ - quarter)}. Bis dahin bewegt sich
            der Markt weiter — der Preis steht erst, wenn die Gebote da sind.
          </div>
        )}
        {locked && (
          <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--ink2)" }}>
            🔔 Restbeteiligung im Lock-up, Platzierung in {hj(c.lockUntil - quarter)} zum dann gültigen Kurs.
          </div>
        )}
        {blocked && <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--ox)" }}>
          🚫 Nach dem abgebrochenen Prozess für {hj(c.block - quarter)} gesperrt.
        </div>}

        {!practice && !inProc && !locked && (
          <>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className={"solid" + sp("proc")} style={{ flex: 1 }} disabled={!canProc || procCount >= MAX_PROC} onClick={act.proc}>
                Verkaufsprozess einleiten
              </button>
              <button style={{ flex: 1 }} disabled={!canNow} onClick={act.bil}>Bilateral verkaufen</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={{ flex: 1 }} disabled={!canNow} onClick={act.cv}>🔄 GP-led Secondary</button>
              <button style={{ flex: 1 }} disabled={!ipoOpen} onClick={act.ipo}>🔔 IPO</button>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink2)", marginTop: 8, lineHeight: 1.5 }}>
              {c.holdQ < MIN_HOLD ? `Exit ab ${MIN_HOLD} Halbjahren Haltedauer — noch ${MIN_HOLD - c.holdQ}.`
                : blocked ? `Verkaufsprozess für ${hj(c.block - quarter)} gesperrt. Bilateral und Continuation bleiben möglich.`
                : procCount >= MAX_PROC ? `Maximal ${MAX_PROC} Verkaufsprozesse gleichzeitig.`
                : endPressure(quarter) > 0.05
                  ? `Exitfenster schließt sich: Käufer preisen die Laufzeit deines Fonds ein, aktuell −${x(endPressure(quarter))} auf den erzielbaren Multiple. Jedes weitere Halbjahr kostet mehr.`
                : PERIODS - quarter <= END_PRESSURE_FROM + 2
                  ? `Noch ${hj(PERIODS - quarter)} Laufzeit. Ab ${hj(END_PRESSURE_FROM)} vor Schluss preisen Käufer den Verkaufsdruck ein — ein Prozess braucht selbst ${hj(PROC_Q)}.`
                : ipoOpen ? "Börsenfenster offen: 40 % platzieren, Rest ein Jahr im Lock-up."
                : "Jede Option zeigt Bewertung und Rückfluss, bevor du freigibst."}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Pips({ v, cls }) {
  return (
    <span className="pips">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = v - i;
        return <i key={i} className={"pip " + cls + (fill >= 1 ? " on" : fill > 0 ? " on half" : "")} />;
      })}
    </span>
  );
}

function Stages({ c, compact }) {
  const pl = peopleLvl(c), A = accEff(c), OS = overstretch(c);
  const sc = (c.searches || [])[0];
  const runP = sc ? (sc.waiting ? "Shortlist" : "Search") : null;
  const runI = c.initP ? "Performance" : c.initA ? "Growth" : null;
  const vac = ["ceo", "cfo", "r3"].filter((k) => c[k].skill <= 0).length;
  return (
    <div className="ppa">
      <div className="row">
        <span className="lbl">People</span><Pips v={pl} cls="p" />
        <span className={"st " + (vac ? "warn" : runP ? "run" : "")}>
          {vac ? `${vac} vakant` : runP ? runP : pl.toFixed(1)}
        </span>
      </div>
      <div className="row">
        <span className="lbl">Performance</span><Pips v={c.plat} cls="l" />
        <span className={"st " + (c.initP ? "run" : c.plat < 1.5 ? "warn" : "")}>
          {c.initP ? `${c.initP.doneQ - (compact || 0)} HJ`
            : c.plat < 1.5 ? "unter Benchmark" : c.plat < 2.5 ? "Benchmark" : c.plat < 3.5 ? "über Benchmark" : "Best-in-Class"}
        </span>
      </div>
      <div className="row">
        <span className="lbl">Growth</span><Pips v={c.acc} cls="a" />
        <span className={"st " + (OS > 0 ? "warn" : c.initA ? "run" : c.acc < 1.5 ? "warn" : "")}>
          {OS > 0 ? "überdehnt" : c.initA ? `${c.initA.doneQ - (compact || 0)} HJ`
            : c.acc < 1.5 ? "unter Benchmark" : c.acc < 2.5 ? "Benchmark" : c.acc < 3.5 ? "über Benchmark" : "Best-in-Class"}
        </span>
      </div>
      {OS > 0 && <div style={{ fontSize: 11, color: "var(--ox)", paddingBottom: 4 }}>
        ⚠️ Überdehnt — nur {A.toFixed(1)} von {c.acc.toFixed(1)} wirken
      </div>}
    </div>
  );
}

function Track({ c }) {
  const h = c.hist || [];
  if (h.length < 2) {
    return <div className="pad" style={{ paddingTop: 4, paddingBottom: 14, fontSize: 12, color: "var(--ink2)" }}>
      Verlauf ab dem zweiten Halbjahr.
    </div>;
  }
  const W = 300, H = 112, T = 8, B = 86, L = 4, R = 296;
  const maxBar = Math.max(...h.map((p) => p.rev)) * 1.08;
  const eqs = h.map((p) => p.eq);
  const base = c.costTotal ?? c.entryEquity;
  const hi = Math.max(...eqs, base) * 1.1;
  const lo = Math.min(...eqs, base, 0) * 1.1;
  const px = (i) => L + ((i + 0.5) / h.length) * (R - L);
  const pyEq = (v) => B - ((v - lo) / (hi - lo || 1)) * (B - T);
  const pyBar = (v) => B - (Math.max(0, v) / maxBar) * (B - T);
  const gw = (R - L) / h.length;
  const bw = Math.max(1.6, gw / 2 - 0.7);
  const line = h.map((p, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${pyEq(p.eq).toFixed(1)}`).join(" ");

  const first = h[0], last = h[h.length - 1];
  const dRev = (last.rev / first.rev - 1) * 100;
  const dEb = (last.eb / first.eb - 1) * 100;
  const dMg = last.mg - first.mg;
  const dNd = last.nd / last.eb - first.nd / first.eb;
  const dQl = (last.ql ?? 0) - (first.ql ?? 0);

  return (
    <>
      <div className="pad" style={{ paddingTop: 4, paddingBottom: 14 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Entwicklung über die Halteperiode</div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} role="img"
          aria-label={`Verlauf von EBITDA und Eigenkapitalwert über ${h.length - 1} Halbjahre`}>
          {/* Jahresraster */}
          {h.map((p, i) => (i > 0 && i % 2 === 0 ?
            <g key={i}>
              <line x1={px(i)} y1={T} x2={px(i)} y2={B} style={{ stroke: "var(--rule)" }} strokeDasharray="1 3" />
              <text x={px(i)} y={B + 12} fontSize="8" textAnchor="middle" style={{ fill: "var(--ink2)" }} fontFamily="Inter">J{i / 2}</text>
            </g> : null))}
          {/* Umsatz und EBITDA als Säulenpaar je Halbjahr */}
          {h.map((p, i) => (
            <g key={i}>
              <rect x={px(i) - bw - 0.35} y={pyBar(p.rev)} width={bw} height={Math.max(1, B - pyBar(p.rev))}
                fill={SECCOLOR[c.sector]} opacity=".45" />
              <rect x={px(i) + 0.35} y={pyBar(p.eb)} width={bw} height={Math.max(1, B - pyBar(p.eb))}
                style={{ fill: "var(--teal)" }} />
            </g>
          ))}
          {/* Einstiegsniveau des Eigenkapitals */}
          <line x1={L} y1={pyEq(base)} x2={R} y2={pyEq(base)} style={{ stroke: "var(--gold)" }} strokeDasharray="4 3" />
          {/* Eigenkapitalwert */}
          <path d={line} fill="none" style={{ stroke: "var(--ink)" }} strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx={px(h.length - 1)} cy={pyEq(last.eq)} r="3" style={{ fill: "var(--ink)" }} />
          <line x1={L} y1={B} x2={R} y2={B} style={{ stroke: "var(--rule)" }} />
          <text x={L} y={B + 12} fontSize="8" style={{ fill: "var(--ink2)" }} fontFamily="Inter">Einstieg</text>
          <text x={R} y={pyEq(last.eq) - 6} fontSize="9" textAnchor="end" style={{ fill: "var(--ink)" }}
            fontFamily="JetBrains Mono" fontWeight="700">{Math.round(last.eq)}</text>
          <text x={L} y={H - 2} fontSize="7.5" style={{ fill: "var(--ink2)" }} fontFamily="Inter">
            <tspan fill={SECCOLOR[c.sector]}>▮</tspan> Umsatz   <tspan style={{ fill: "var(--teal)" }}>▮</tspan> EBITDA   <tspan style={{ fill: "var(--ink)" }}>▬</tspan> Gesamtwert
          </text>
        </svg>
      </div>
      {/* Drei Deltas als Spalten. Fünf im Fließtext waren auf dem Telefon unlesbar. */}
      <div className="deltas">
        {[["EBITDA", dEb, "%", 0], ["Marge", dMg, "pp", 1], ["Leverage", dNd, "×", 1]].map(([l, v, u, dg]) => (
          <div key={l}>
            <div className="eyebrow">{l}</div>
            <div className="mono dv" style={{ color: (l === "Leverage" ? v <= 0 : v >= 0) ? "var(--teal)" : "var(--ox)" }}>
              {v >= 0 ? "+" : "−"}{Math.abs(v).toFixed(dg)}{u === "%" ? " %" : u}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* TVPI-Verlauf der Kohorte. Der eigene Fonds kräftig, die Wettbewerber im Hintergrund,
   dazu das Interquartilsband — die Währung, in der im Fundraising gesprochen wird.   */
function TvpiChart({ hist, meIdx }) {
  if (!hist || hist.length < 2) return <div className="quiet">Der Verlauf entsteht ab dem zweiten Halbjahr.</div>;
  const T = 8, B = 96, L = 26, R = 276;
  const all = hist.flat();
  const hi = Math.max(1.15, Math.max(...all) * 1.05), lo = Math.min(-0.1, Math.min(...all) * 1.05);
  const px = (i) => L + (i / (hist.length - 1)) * (R - L);
  const py = (v) => B - ((v - lo) / (hi - lo || 1)) * (B - T);
  const n = hist[0].length;
  const q = (k) => hist.map((row, i) => {
    const srt = [...row].sort((a, b) => a - b);
    return `${px(i).toFixed(1)},${py(srt[k]).toFixed(1)}`;
  });
  const band = `M${q(n - 2).join(" L")} L${q(1).reverse().join(" L")} Z`;
  const last = hist[hist.length - 1];
  const rank = [...last].sort((a, b) => b - a).indexOf(last[meIdx]) + 1;
  return (
    <div className="pad" style={{ paddingTop: 4 }}>
      <svg viewBox="0 0 300 112" style={{ width: "100%", display: "block" }} role="img"
        aria-label="Wertungsverlauf des eigenen Fonds gegen die Kohorte">
        {[hi, (hi + lo) / 2, lo].map((v, i) => (
          <g key={i}>
            <line x1={L} y1={py(v)} x2={R} y2={py(v)} style={{ stroke: "var(--rule)" }} strokeDasharray={i === 2 ? "" : "1 3"} />
            <text x={L - 4} y={py(v) + 3} fontSize="7.5" textAnchor="end" fontFamily="JetBrains Mono"
              style={{ fill: "var(--ink2)" }}>{v.toFixed(2)}</text>
          </g>
        ))}
        <path d={band} style={{ fill: "var(--teal)", opacity: .10 }} />
        {hist[0].map((_, k) => k === meIdx ? null : (
          <path key={k} fill="none" strokeWidth="1.2" style={{ stroke: "var(--rule)" }}
            d={hist.map((row, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(row[k]).toFixed(1)}`).join(" ")} />
        ))}
        <path fill="none" strokeWidth="2.2" strokeLinejoin="round" style={{ stroke: "var(--ink)" }}
          d={hist.map((row, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(row[meIdx]).toFixed(1)}`).join(" ")} />
        <circle cx={px(hist.length - 1)} cy={py(last[meIdx])} r="3" style={{ fill: "var(--ink)" }} />
        <text x={R + 2} y={py(last[meIdx]) + 3} fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700"
          style={{ fill: "var(--ink)" }}>{last[meIdx].toFixed(2)}</text>
        <text x={L} y={B + 12} fontSize="7.5" fontFamily="Inter" style={{ fill: "var(--ink2)" }}>HJ 0</text>
        <text x={R} y={B + 12} fontSize="7.5" fontFamily="Inter" textAnchor="end"
          style={{ fill: "var(--ink2)" }}>HJ {hist.length - 1}</text>
      </svg>
      <p className="hint" style={{ marginTop: 8 }}>Platz {rank} von {n} · {rank <= Math.ceil(n / 4) ? "1. Quartil"
        : rank <= Math.ceil(n / 2) ? "2. Quartil" : rank <= Math.ceil(n * 3 / 4) ? "3. Quartil" : "4. Quartil"}</p>
    </div>
  );
}

/* Sektorallokation auf NAV-Basis — zeigt Klumpenrisiko, das in einer Liste untergeht. */
function SectorSplit({ holdings, market, cash }) {
  const nav = {};
  holdings.forEach((c) => { nav[c.sector] = (nav[c.sector] || 0) + navValueOf(c, market); });
  const total = Object.values(nav).reduce((a, b) => a + b, 0);
  if (total <= 0) return <div className="quiet">Noch kein investiertes Kapital.</div>;
  const rows = SECNAMES.filter((s) => nav[s] > 0).sort((a, b) => nav[b] - nav[a]);
  let run = 0;
  /* Balken im .pad, Tabelle daneben auf gleicher Rinne — vorher stand die Tabelle
     im .pad und war dadurch doppelt eingerückt.                                  */
  return (
    <>
      <div className="pad" style={{ paddingTop: 4, paddingBottom: 14 }}>
        <svg viewBox="0 0 300 14" style={{ width: "100%", display: "block" }} role="img"
          aria-label="Sektorallokation des Portfolios auf NAV-Basis">
          {rows.map((sec) => {
            const w = (nav[sec] / total) * 300, xx = run; run += w;
            return <rect key={sec} x={xx} y="0" width={Math.max(1, w - 1)} height="14" fill={SECCOLOR[sec]} />;
          })}
        </svg>
      </div>
      <table className="ledger"><tbody>
        {rows.map((sec) => (
          <tr key={sec}>
            <td className="lab"><i className="sdot" style={{ background: SECCOLOR[sec] }} />{SECLABEL[sec]}</td>
            <td>{eur(nav[sec])} · {Math.round(nav[sec] / total * 100)} %</td>
          </tr>
        ))}
      </tbody></table>
      {nav[rows[0]] / total > 0.5 && (
        <p className="hint ox" style={{ padding: "12px 15px 15px" }}>
          Klumpenrisiko: über 50 % NAV in {SECLABEL[rows[0]]}
        </p>
      )}
    </>
  );
}

/* Portfolioregal: eine Kachel je Beteiligung mit Wertverlauf, Miniatur-Tragwerk und
   Zustandsflagge. Der freie Platz bleibt sichtbar — Deployment-Druck als Lücke.     */
function Shelf({ holdings, market, cash, quarter, onPick }) {
  return (
    <>
      {holdings.map((c) => {
        const h = healthOf(c, market);
        const col = h.attention ? "var(--ox)" : "var(--teal)";
        const t = (c.hist || []).map((p) => p.eq || 0);
        const base = c.costTotal || 1;
        const vals = t.length > 1 ? t.map((v) => v / base) : [1, 1];
        const hiV = Math.max(1.15, ...vals), loV = Math.min(0.85, ...vals);
        const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 64},${24 - (v - loV) / (hiV - loV || 1) * 22}`).join(" ");
        return (
          <div className="card st shelf" key={c.uid} style={{ "--sec": SECCOLOR[c.sector] }}
            onClick={() => onPick && onPick(c.uid)}>
            <div className="pad shelfrow">
              <div className="shelfmain">
                <div className="shelfname">
                  <i className="hdot" style={{ background: col }} />{c.name}
                </div>
                <div className="shelfmeta">
                  {h.top ? h.top.t : "auf Kurs"} <span style={{ opacity: .55 }}>· {c.holdQ} HJ</span>
                </div>
              </div>
              <svg viewBox="0 0 64 26" style={{ width: 64, flex: "none" }} role="img"
                aria-label={`Wertverlauf von ${c.name}`}>
                <line x1="0" y1={24 - (1 - loV) / (hiV - loV || 1) * 22} x2="64"
                  y2={24 - (1 - loV) / (hiV - loV || 1) * 22} style={{ stroke: "var(--rule)" }} strokeDasharray="2 2" />
                <polyline points={pts} fill="none" stroke={col} strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              <div className="mono shelfmoic" style={{ color: col }}>{h.moic.toFixed(2)}×</div>
            </div>
          </div>
        );
      })}
      {holdings.length < MAX_SLOTS && (
        <div className="card slot">
          <div style={{ textAlign: "center", color: "var(--ink2)", padding: "18px 15px" }}>
            <div style={{ fontSize: 12 }}>
              {MAX_SLOTS - holdings.length === 1 ? "Ein freier Platz" : `${MAX_SLOTS - holdings.length} freie Plätze`}
              {" · "}{eur(cash)} · noch {hj(PERIODS - quarter)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Begriffserklärung über die volle Breite. Vorher standen die Erklärungen in der
   Wertspalte einer Ledger-Tabelle, deren Labelspalte nicht umbrechen darf — der
   Text lief dadurch über den Rand hinaus.                                       */
function Def({ t, children }) {
  return (
    <div className="def">
      <div className="dt">{t}</div>
      <div className="dd">{children}</div>
    </div>
  );
}

function MarketChart({ hist }) {
  if (!hist || hist.length < 2) {
    return <div className="quiet">Die Zeitreihe entsteht ab dem zweiten Halbjahr.</div>;
  }
  const W = 300, T = 8, B = 78, L = 2, R = 286;
  const all = hist.flatMap((h) => SECNAMES.map((s) => h[s]));
  const hi = Math.max(...all) * 1.04, lo = Math.min(...all) * 0.96;
  const px = (i) => L + (i / (hist.length - 1)) * (R - L);
  const py = (v) => B - ((v - lo) / (hi - lo || 1)) * (B - T);
  return (
    <div className="pad" style={{ paddingTop: 10, paddingBottom: 4 }}>
      <svg viewBox={`0 0 ${W} 92`} style={{ width: "100%", display: "block" }} role="img"
        aria-label="Verlauf der Sektormultiples">
        {hist.map((h, i) => (i > 0 && i % 2 === 0 ?
          <g key={i}>
            <line x1={px(i)} y1={T} x2={px(i)} y2={B} style={{ stroke: "var(--rule)" }} strokeDasharray="1 3" />
            <text x={px(i)} y={B + 11} fontSize="8" textAnchor="middle" style={{ fill: "var(--ink2)" }} fontFamily="Inter">J{i / 2}</text>
          </g> : null))}
        <line x1={L} y1={B} x2={R} y2={B} style={{ stroke: "var(--rule)" }} />
        {SECNAMES.map((s) => (
          <g key={s}>
            <path d={hist.map((h, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(h[s]).toFixed(1)}`).join(" ")}
              fill="none" stroke={SECCOLOR[s]} strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx={px(hist.length - 1)} cy={py(hist[hist.length - 1][s])} r="2.4" fill={SECCOLOR[s]} />
            <text x={R + 3} y={py(hist[hist.length - 1][s]) + 3} fontSize="7.5" fill={SECCOLOR[s]}
              fontFamily="JetBrains Mono">{hist[hist.length - 1][s].toFixed(1)}</text>
          </g>
        ))}
        <text x={L} y={90} fontSize="7.5" style={{ fill: "var(--ink2)" }} fontFamily="Inter">
          EV/EBITDA je Sektor über die Fondslaufzeit
        </text>
      </svg>
    </div>
  );
}


/* ---------- Verwendung der Exiterlöse ----------
   Die Entscheidung, die es vorher nicht gab: Was zurück an die Investoren geht
   und was im Fonds bleibt. Einbehalten heißt, dass mehr Kapital je abgerufenem
   Euro arbeitet — das hebt den TVPI. Es kostet aber IRR, und zwar systematisch:
   Ausschütten und später neu abrufen ergibt einen Rückfluss heute und einen
   Abruf morgen; Einbehalten ergibt beides gar nicht. Der frühere Rückfluss
   gewinnt in der Verzinsung immer. Recycling kauft also TVPI mit IRR.        */
function UseProceeds({ item, me, quarter, settle }) {
  const { net, c } = item;
  const room = recycleRoom(me, net, quarter);
  const [keep, setKeep] = useState(0);
  const rec = Math.min(room, net * keep);
  const dist = net - rec;
  const capLeft = Math.max(0, CAPITAL * RECYCLE_CAP - (me.recycled || 0));
  const investAfter = investableOf(me, quarter) + rec;
  return (
    <div className="modal">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="tomb">
          <div className="sub">Verwendung der Erlöse</div>
          <div className="amt" style={{ fontSize: 24 }}>{eur(net)}</div>
          <div className="sub">aus dem Exit von {c.name}</div>
        </div>
        <div className="card">
          <div className="slrow"><span>Im Fonds einbehalten</span>
            <span className="slval">{Math.round((rec / Math.max(0.01, net)) * 100)} % · {eur(rec)}</span></div>
          <input type="range" min={0} max={100} step={5} value={Math.round(keep * 100)}
            onChange={(e) => setKeep(+e.target.value / 100)} />
          <table className="kv" style={{ marginTop: 10 }}><tbody>
            <tr><td className="lab">An die Investoren</td><td>{eur(dist)}</td></tr>
            <tr><td className="lab">Verfügbar für neue Deals</td><td>{eur(investAfter)}</td></tr>
            <tr><td className="lab">Recycling-Spielraum</td>
              <td>{eur(capLeft)}{quarter > INVEST_PERIOD ? " — Investitionsperiode beendet" : ""}</td></tr>
          </tbody></table>
          <p className="hint" style={{ marginTop: 10 }}>
            Einbehalten bringt TVPI und kostet IRR: Das Geld arbeitet weiter, statt zu den Investoren
            zurückzufließen — der Rückfluss verschiebt sich nach hinten, und der Betrag steht wieder im
            Risiko. Lohnt sich, wenn ein konkreter Deal vor dir liegt und das offene Commitment knapp ist.
            Ausschütten lohnt, wenn im Dealflow nichts Überzeugendes steht: Dann läge das Geld nur herum.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, margin: "0 16px 24px" }}>
          <button style={{ flex: 1 }} onClick={() => settle(0)}>Voll ausschütten</button>
          <button className="solid" style={{ flex: 1 }} onClick={() => settle(keep)}>
            {rec > 0.5 ? `${eur(rec)} einbehalten` : "Bestätigen"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InitPicker({ c, dim, market, start, close }) {
  const seat = dim === "plat" ? "cfo" : "r3";
  const E = effSkill(c, seat) * (c.onboard > 0 ? 0.7 : 1);
  const eb = ebitdaOf(c);
  const lvl = dim === "plat" ? c.plat : c.acc;
  return (
    <div className="modal" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="tomb">
          <div className="sub">{dim === "plat" ? "Performance" : "Growth"}</div>
          <div className="amt" style={{ fontSize: 24 }}>{c.name}</div>
          <div className="sub">Reifegrad {lvl.toFixed(1)} · effektives Rating {E.toFixed(1)}</div>
        </div>
        {INITS[dim].map((k) => {
          const runs = initRuns(c, k.id);
          const rep = repeatMalus(runs);
          const maxed = runs >= REPEAT_MAX;
          const locked = (k.req && !k.req(c)) || maxed;
          const dur = Math.max(1, initDur(E) + (k.dm || 0) + rep.dm);
          const p = clamp(initSuccess(E, k.cls) + (k.sm || 0) + rep.sm + (k.ma ? addonRisk(c) : 0), 0.1, 0.97);
          const FI = fitLabel(k.id, c);
          const g = initGain(E) * (k.gm || 1) * rep.gm * FI.f * ceilingFactor(lvl);
          const chk = addonCheck(c, market);
          const noFin = k.ma && !chk.ok;
          return (
            <div className={"card" + (noFin ? " lm" : "")} key={k.id} style={{ marginTop: 10, opacity: locked ? 0.45 : 1 }}>
              <div className="pad" style={{ paddingTop: 12, paddingBottom: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{k.n}</span>
                  <span className={"tag" + (maxed ? "" : k.cls === "hard" ? " flag" : "")} style={{ flex: "none" }}>
                    {maxed ? "ausgereizt" : runs > 0 ? `${runs + 1}. Auflage · ${CLS_LABEL[k.cls]}` : CLS_LABEL[k.cls]}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 5, lineHeight: 1.45 }}>{k.d}</div>
              </div>
              <table className="ledger"><tbody>
                {k.ma ? (<>
                  <tr><td className="lab">EBITDA Add-on-Target</td><td>{eur(chk.addEb)} · {Math.round((c.addonSize ?? 0.275) * 100)} % der Plattform</td></tr>
                  <tr><td className="lab">Einstandsmultiple Add-on</td><td>{x(chk.mult)} <span style={{ fontSize: 11, color: "var(--ink2)" }}>= (Branche {x(market[c.sector])} + Einstieg {x(c.entryMult)}) / 2 − 2,0</span></td></tr>
                  <tr><td className="lab">Kaufpreis, fremdfinanziert</td><td>{eur(chk.price)}</td></tr>
                  <tr><td className="lab">Leverage heute</td><td>{x(c.netDebt / Math.max(0.5, eb))}</td></tr>
                  <tr><td className="lab">Pro forma nach Add-on</td>
                    <td style={{ color: chk.ok ? "var(--teal)" : "var(--ox)", fontWeight: 600 }}>
                      {x(chk.lev)} gegen Finanzierungsgrenze {x(chk.limit)}
                      <span style={{ fontSize: 11, color: "var(--ink2)", fontWeight: 400 }}>
                        {" "}(Covenant {x(c.covLimit ?? 6.5)} abzüglich {ADDON_HEADROOM.toFixed(1).replace(".", ",")} Puffer)</span></td></tr>
                  <tr><td className="lab">Integrationswahrscheinlichkeit</td>
                    <td style={{ color: p >= 0.5 ? "var(--ink)" : "var(--ox)" }}>{Math.round(p * 100)} %
                      <span style={{ fontSize: 11, color: "var(--ink2)" }}>
                        {" "}— {c.plat < 2.5 ? "Prozesse noch unreif" : c.plat >= 3.5 ? "reife Prozesse tragen die Integration" : "Prozessreife im Mittelfeld"}
                        {c.netDebt / Math.max(0.5, eb) > 3.5 ? ", hohe Verschuldung" : ""}
                        {(c.addonSize ?? 0.275) > 0.28 ? ", großer Bissen" : ""}
                      </span></td></tr>
                  <tr><td className="lab">Bei gescheiterter Integration</td>
                    <td style={{ color: "var(--ox)" }}>nur 35 % des Umsatzes, Schuld steht voll</td></tr>
                  <tr><td className="lab">Bei Erfolg</td><td>Umsatz +{Math.round(chk.addEb / Math.max(4, c.benchMargin ?? 12) * 100 / c.revenue * 100)} % · Reifegrad +1,0</td></tr>
                </>) : (<>
                  <tr><td className="lab">Eignung für diesen Fall</td>
                    <td style={{ color: FI.color, fontWeight: 600 }}>{FI.t}
                      <span style={{ fontSize: 11, color: "var(--ink2)", fontWeight: 400 }}> — {FI.why}</span></td></tr>
                  <tr><td className="lab">Erfolgswahrscheinlichkeit</td><td style={{ color: p >= 0.7 ? "var(--teal)" : p >= 0.5 ? "var(--ink)" : "var(--ox)" }}>{Math.round(p * 100)} %</td></tr>
                  <tr><td className="lab">Dauer</td><td>{hj(dur)}</td></tr>
                  <tr><td className="lab">Reifegradgewinn</td><td>+{g.toFixed(2)}{k.spread ? ` (streut ${k.spread[0]}–${k.spread[1]}×)` : ""}</td></tr>
                  <tr><td className="lab">Bei Zielverfehlung</td>
                    <td style={{ color: k.cls === "rel" ? "var(--ink)" : "var(--ox)" }}>
                      {k.cls === "rel"
                        ? `Teillieferung +${(g * PARTIAL_DELIVERY).toFixed(2)}`
                        : "kein Reifegradgewinn"}</td></tr>
                  {!!k.oneOff && <tr><td className="lab">Einmalaufwand</td>
                    <td>{eur(eb * k.oneOff)} <span style={{ fontSize: 11, color: "var(--ink2)" }}>cash, nicht im EBITDA</span></td></tr>}
                  {!!k.drag && <tr><td className="lab">Margenbelastung</td>
                    <td>−{k.drag.toFixed(1).replace(".", ",")} pp während der Laufzeit</td></tr>}
                  {!!k.cx && <tr><td className="lab">Zusätzlicher Investitionsbedarf</td><td>+{k.cx.toFixed(1).replace(".", ",")} pp vom Umsatz</td></tr>}
                  {!!k.release && <tr><td className="lab">Cash Release</td><td style={{ color: "var(--teal)" }}>{eur(eb * k.release)}</td></tr>}
                  <tr><td className="lab">Sunk Cost bei Fehlschlag</td>
                    <td style={{ color: "var(--ox)" }}>{eur(eb * (k.failCost != null ? k.failCost : FAIL_SUNK))}
                      {k.failMargin ? ` · dauerhaft ${k.failMargin.toFixed(1).replace(".", ",")} pp Marge` : ""}</td></tr>
                </>)}
              </tbody></table>
              <div className="pad" style={{ paddingTop: 10 }}>
                <button className={"solid" + (noFin ? " ox" : "")} style={{ width: "100%" }}
                  disabled={locked || noFin} onClick={() => start(k.id)}>
                  {maxed ? "Ausgereizt — hier ist nichts mehr zu holen" : locked ? k.reqT
                    : noFin ? "Keine Finanzierung — Covenant Breach"
                    : runs > 0 ? `${runs + 1}. Auflage starten` : "Starten"}
                </button>
              </div>
            </div>
          );
        })}
        <div style={{ margin: "10px 16px 28px" }}>
          <button style={{ width: "100%" }} onClick={close}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}

function Shortlist({ item, holding, analysis, hire, reject }) {
  const eb = holding ? ebitdaOf(holding) : 0;
  const nm = item.seat === "ceo" ? "CEO" : item.seat === "cfo" ? "CFO" : ROLE3[holding ? holding.sector : "Software"].n;
  const precise = analysis >= 4;
  const ceoSk = holding ? holding.ceo.skill : 2;
  const cap = item.seat === "ceo" ? 5 : ceoSk + 1.5;
  return (
    <div className="modal">
      <div className="sheet">
        <div className="tomb">
          <div className="sub">Shortlist · {nm}</div>
          <div className="amt" style={{ fontSize: 24 }}>{item.name}</div>
          <div className="sub">{precise ? "Due Diligence 4+ — enge Schätzung" : "Rating nur grob einschätzbar"}</div>
        </div>
        {item.cands.map((k, i) => {
          const span = precise ? 0.5 : k.span;
          const lo = Math.max(1, k.shown - span), hi = Math.min(5, k.shown + span);
          return (
            <div className="card" key={i} style={{ marginTop: i === 0 ? 12 : 8 }}>
              <div className="pad" style={{ paddingTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{k.label}</span>
                  <span className="mono" style={{ fontSize: 17 }}>Rating {lo.toFixed(1)}–{hi.toFixed(1)}</span>
                </div>
              </div>
              <table className="ledger"><tbody>
                <tr><td className="lab">Signing Bonus</td><td>{eur(signBonusOf(item.seat, k.shown, eb))}</td></tr>
                <tr><td className="lab">Gehalt p.a.</td><td>{eur(payOf(item.seat, k.shown, eb))}</td></tr>
                <tr><td className="lab">Effektives Rating unter diesem CEO</td>
                  <td style={{ color: cap < k.shown ? "var(--ox)" : "var(--ink)" }}>
                    {Math.min(k.shown, cap).toFixed(1)}{cap < k.shown ? ` — auf ${cap.toFixed(1)} gedeckelt` : ""}</td></tr>
                <tr><td className="lab">Erfolgsquote rel. / transf. / markt.</td>
                  <td>{["rel", "tr", "hard"].map((cl) => Math.round(initSuccess(Math.min(k.shown, cap) + 0.5 * ceoSk, cl) * 100)).join(" / ")} %</td></tr>
                <tr><td className="lab">Entwicklungspotenzial</td><td>{k.dev ? "+0,25 je Halbjahr bis 4,5" : "stabil"}</td></tr>
                <tr><td className="lab">Retention-Risiko</td>
                  <td>{(POACH * k.shown * k.shown * k.poach * 100).toFixed(1)} % je HJ</td></tr>
              </tbody></table>
              <div className="pad" style={{ paddingTop: 8, paddingBottom: 0, fontSize: 12, color: "var(--ink2)", lineHeight: 1.45 }}>{k.note}</div>
              <div className="pad" style={{ paddingTop: 10 }}>
                <button className="solid" style={{ width: "100%" }} onClick={() => hire(item, k)}>Verpflichten</button>
              </div>
            </div>
          );
        })}
        <div className="pad" style={{ padding: "4px 16px 8px", fontSize: 11.5, color: "var(--ink2)", lineHeight: 1.5 }}>
          Das wahre Rating steht erst beim Antritt fest. Eine Fachposition wirkt höchstens bis CEO-Rating +1,5 —
          ein A-Player unter einem schwachen CEO verpufft. Einen Amtsinhaber zu ersetzen kostet zwölf
          Monatsgehälter Abfindung, danach ein Halbjahr Einarbeitung mit gebremstem Tempo.
        </div>
        <div style={{ margin: "0 16px 28px" }}>
          <button className="ox" style={{ width: "100%" }} onClick={() => reject(item)}>
            Alle ablehnen — neue Shortlist, halber Retainer
          </button>
        </div>
      </div>
    </div>
  );
}

function Offers({ item, holding, market, neg, decide }) {
  const eb = holding ? ebitdaOf(holding) : 0;
  const st = holding ? (holding.st ?? 1) : 1;
  const nd = holding ? holding.netDebt : 0;
  const fair = holding ? fairOf(holding, market, neg) : 0;
  const mMult = holding ? markMultiple(holding, market) : 0;

  return (
    <div className="modal">
      <div className="sheet">
        <div className="tomb">
          <div className="sub">Gebote eingegangen</div>
          <div className="amt" style={{ fontSize: 26 }}>{item.name}</div>
          <div className="sub">NAV {eur(holding ? navValueOf(holding, market) : 0)} · Bewertungsmultiple {x(mMult)}</div>
        </div>
        {item.offers.map((o, i) => {
          const eqv100 = st > 0 ? o.price / st : 0;
          const ev = eqv100 + nd;
          const impMult = eb > 0 ? ev / eb : 0;
          const net = o.price * (1 - PROC_FEE);
          const moic = holding ? net / holding.entryEquity : 0;
          return (
            <div className="card" key={i} style={{ marginTop: i === 0 ? 12 : 8 }}>
              <div className="pad" style={{ paddingTop: 12, paddingBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{o.buyer}</span>
                  <span className="mono" style={{ fontSize: 17 }}>{x(impMult)}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 6, lineHeight: 1.45 }}>{o.note}</div>
              </div>
              <table className="ledger"><tbody>
                <tr><td className="lab">EBITDA (LTM)</td><td>{eur(eb)}</td></tr>
                <tr><td className="lab">Gebotenes Multiple</td><td>{x(impMult)}
                  <span style={{ color: impMult >= mMult ? "var(--teal)" : "var(--ox)", fontSize: 11 }}>
                    {" "}{impMult >= mMult ? "+" : ""}{(impMult - mMult).toFixed(1).replace(".", ",")} vs. Markt
                  </span></td></tr>
                <tr><td className="lab">Enterprise Value</td><td>{eur(ev)}</td></tr>
                <tr><td className="lab">− Nettoverschuldung</td><td>−{eur(nd)}</td></tr>
                <tr><td className="lab">= Equity Value (100 %)</td><td>{eur(eqv100)}</td></tr>
                {st < 1 && <tr><td className="lab">× Anteil {Math.round(st * 100)} %</td><td>{eur(o.price)}</td></tr>}
                <tr><td className="lab">= Bruttoerlös</td><td>{eur(o.price)}</td></tr>
                <tr><td className="lab">− Transaktionskosten {PROC_FEE * 100} %</td><td>−{eur(o.price * PROC_FEE)}</td></tr>
                <tr><td className="lab" style={{ fontWeight: 600 }}>= Nettoerlös</td>
                  <td style={{ fontWeight: 700 }}>{eur(net)}</td></tr>
                <tr><td className="lab">MOIC (Deal)</td>
                  <td style={{ color: moic >= 1 ? "var(--teal)" : "var(--ox)" }}>{moic.toFixed(2)}×</td></tr>
              </tbody></table>
              <div className="pad" style={{ paddingTop: 10 }}>
                <div style={{ fontSize: 11.5, color: o.risk ? "var(--ox)" : "var(--teal)", marginBottom: 10 }}>
                  {o.risk ? `⚖️ Vollzugsrisiko ${Math.round(o.risk * 100)} %` : "✓ Vollzug gesichert"}
                  {"  ·  "}{fair > 0 ? (o.price / fair).toFixed(2) : "—"}× des erzielbaren Werts
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="solid" style={{ flex: 1 }} onClick={() => decide(o, "accept")}>Annehmen</button>
                  <button style={{ flex: 1 }} onClick={() => decide(o, "reneg")}>Nachverhandeln</button>
                </div>
              </div>
            </div>
          );
        })}
        <div className="pad" style={{ padding: "4px 16px 8px", fontSize: 11.5, color: "var(--ink2)", lineHeight: 1.5 }}>
          Nachverhandeln: 60 % Chance auf 5–8 % mehr, 25 % Chance, dass der Bieter abspringt und nur das nächste
          Gebot bleibt. Alle Erlöse abzüglich 3 % Transaktionskosten.
        </div>
        <div style={{ margin: "0 16px 28px" }}>
          <button className="ox" style={{ width: "100%" }} onClick={() => decide(null, "abort")}>
            Prozess abbrechen — ein Jahr Sperre
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ÜBUNGSMODUS — Value Creation an einer Beteiligung
   Läuft auf denselben Funktionen wie die Partie: stepCompany,
   maturePeople, initSuccess, effSkill, markMultiple, makeBridge.
   Unterschied: ein Unternehmen, eingefrorene Marktmultiples und
   ein Coach, der jede Periode kommentiert.
   ============================================================ */

const PRAC_PERIODS = 10;                                  // fünf Jahre Halteperiode
const PRAC_SLOTS = 2;                                     // Performance und Growth parallel
const PRAC_EXIT_FROM = 6;                                 // ab drei Jahren liegt ein Angebot vor
const PRAC_ATTRS = { sourcing: 2, analysis: 3, negotiation: 2, operations: 3, financing: 2 };

function practiceMarket() {
  const m = {};
  SECNAMES.forEach((s) => (m[s] = SECTORS[s].m));         // eingefroren: keine Marktbewegung
  return m;
}

/* Fester Übungsfall: Sondermaschinenbau, knapp über Benchmarkmarge, beide
   Reifegrade unter Branchenniveau, CFO vakant, Gründer-CEO vor dem Rückzug.
   Damit sind alle drei Dimensionen in einer Partie erfahrbar.               */
/* Ein Ziel für den geführten Durchlauf. Bewusst mit Margenlücke zur Branche und
   moderatem Leverage: So gibt es für jede Werkbank etwas zu tun, und der
   Covenant ist nah genug, dass Verschuldung spürbar bleibt.                  */
function practiceDeal(type) {
  const a = BOOK.Industrials[1];
  const quality = type === "prop" ? 56 : 44;
  const revenue = (type === "prop" ? 78 : 52) * SIZE_SCALE;
  const margin = (a.m[0] + a.m[1]) / 2 - (type === "prop" ? 2.2 : 0.4);
  const growth = SECTORS.Industrials.g + (type === "prop" ? 2.4 : 0.3);
  const navF = 0.7 + QUAL_COEF * quality;
  const disc = type === "prop" ? 1.1 : 0;
  return {
    id: "prac_" + type, type, sector: "Industrials", revenue, margin, quality,
    growth, drift: type === "prop" ? 1.1 : -0.4, dnoise: 0,
    askMult: clamp(SECTORS.Industrials.m * navF - disc, 4, 19),
    levCap: clamp(a.lev[1] - 0.3, 3, 5.5),
    capexPct: a.cx, nwcPct: a.nw,
    benchMargin: (a.m[0] + a.m[1]) / 2, benchCapex: a.cx, benchNwc: a.nw,
    flag: type === "prop" ? "Nachfolgesituation" : null,
    desc: a.d,
    name: type === "prop" ? "Hollmann Präzisionstechnik Gruppe" : "Vierbeck Zulieferwerke Gruppe",
  };
}

function makePracticeCo(d, mult, lev, hadDD) {
  const eb = (d.revenue * d.margin) / 100;
  // Ohne Datenraum dasselbe Post-Closing-Risiko wie in der Partie
  const hit = !hadDD && rnd() < clamp(0.5 - 0.09 * PRAC_ATTRS.analysis, 0.05, 0.5)
    ? 0.10 + rnd() * 0.14 : 0;
  const c = {
    uid: "prac", name: d.name, sector: d.sector, desc: d.desc,
    revenue: d.revenue, margin: d.margin * (1 - hit), quality: d.quality * (1 - hit / 2),
    netDebt: eb * lev, rate: BASE_RATE - 0.25 * PRAC_ATTRS.financing,
    holdQ: 0, flag: d.flag, dd: !!hadDD, hit: hit > 0,
    ceo: { skill: 2.4 }, cfo: { skill: 0 }, r3: { skill: 1.4 },
    plat: 1.1 + rnd() * 0.4, acc: 1.2 + rnd() * 0.4, nwcFix: 0,
    addonSize: 0.24, addonComp: 0,
    ltip: false, searches: [], initP: null, initA: null, onboard: 0,
    st: 1, proc: null, block: 0, lockUntil: null, cv: false, breach: 0,
    covLimit: Math.max(COV_FLOOR, lev + COV_HEADROOM + 0.10 * PRAC_ATTRS.financing),
    capexPct: d.capexPct, nwcPct: d.nwcPct,
    benchMargin: d.benchMargin, benchCapex: d.benchCapex, benchNwc: d.benchNwc,
    drift: d.drift, marginDrift: 0, entryQuality: d.quality * (1 - hit / 2),
    entryMult: mult, entryEbitda: eb, entryDebt: eb * lev,
    entryEV: eb * mult, entryFees: eb * mult * ENTRY_FEE,
    cashOut: 0, recapOut: 0, done: [],
    hist: [{ rev: d.revenue, eb, nd: eb * lev, mg: d.margin, ql: d.quality, eq: eb * mult - eb * lev }],
  };
  c.entryEquity = eb * mult - eb * lev + eb * mult * ENTRY_FEE;
  c.costTotal = c.entryEquity; c.costLeft = c.entryEquity;
  c.baseLoad = seatLoad(c);
  return c;
}

const COACH = [
  { id: "base", when: (o) => o.q === 2,
    t: "Oben in der Leiste läuft eine <b>Kontrollrechnung</b> mit: dieselbe Beteiligung, unangetastet gehalten. Ein moderat gehebeltes, cashstarkes Asset liefert auch ohne jedes Zutun einen Rückfluss — allein aus Entschuldung. Dein Maßstab ist nicht 1,0×, sondern dieser Wert. Alles darunter heißt: die Arbeit hat weniger gebracht, als sie gekostet hat." },
  { id: "bench", when: (o) => !o.c.dd,
    t: "Die <b>Branchenreferenz</b> fehlt noch. Ohne sie steht bei Marge, Capex und Working Capital nur der Ist-Wert — ob 12 % Marge für dieses Geschäftsmodell gut oder schlecht sind, weißt du nicht. Genau daran hängt aber die Priorisierung: Cost-out bringt dort viel, wo die Marge unter dem Branchenniveau liegt, und wenig, wo sie schon darüber steht. Die Studie kostet 1 Mio. € und ist die billigste Entscheidung im ganzen Katalog." },
  { id: "cost", when: (o) => o.q === 1,
    t: "Erste Periode gelaufen. Beachte: die <b>2 % Transaktionskosten</b> beim Kauf sind sofort weg und stecken bereits im Einstieg — die ersten Prozentpunkte verdienst du zurück, bevor du überhaupt Wert schaffst. Deshalb ist der Einstiegspreis die wichtigste Einzelentscheidung im ganzen Deal." },
  { id: "vac", when: (o) => o.c.cfo.skill <= 0 && !(o.c.searches || []).some((s) => s.seat === "cfo") && o.q <= 3,
    t: "Der <b>CFO ist vakant</b>. Eine unbesetzte Position zieht das People-Niveau nach unten — und über <code>min(Growth, People+1, Performance+1)</code> deckelt sie direkt dein Wachstum. Und sie spart kein Geld: die Position wird interimistisch besetzt, und Interim kostet ein Viertel mehr als der Vorgänger. Ein Mandat kostet 30 % eines Jahresgehalts und ein Halbjahr — gemessen an der Wirkung auf jede spätere Maßnahme die schnellste Rendite im ganzen Katalog. Du darfst auch beide offenen Positionen gleichzeitig ausschreiben." },
  { id: "search", when: (o) => (o.c.searches || []).some((s) => !s.waiting),
    t: "Search läuft. Nach einem Halbjahr bekommst du drei Kandidaten. Das angezeigte Rating ist eine <b>Schätzung</b> — die Spanne hängt an deiner Due-Diligence-Stärke, und der wahre Wert steht erst beim Antritt fest." },
  { id: "cap", when: (o) => ["cfo", "r3"].some((k) => isCapped(o.c, k)),
    t: "Eine Fachposition wirkt höchstens bis <b>CEO-Rating + 1,5</b>. Der Überschuss verpufft — du bezahlst ihn trotzdem. A-Player berichten nicht dauerhaft an C-Player; wenn du oben investieren willst, fang beim CEO an." },
  { id: "init", when: (o) => anyInit(o.c) && o.q >= 1,
    t: "Maßnahme läuft. Zwei Dinge bestimmen den Ausgang: das <b>effektive Rating</b> auf der zuständigen Position — es steuert Erfolgswahrscheinlichkeit, Dauer und Höhe des Gewinns — und die <b>Risikoklasse</b>. Mit einem schwachen Team liefern verlässliche Maßnahmen rund 70 %, Transformationsprogramme wie ERP oder KI 50–60 %, marktabhängige nur 20–37 %. Mit einem A-Team sind es 97 %, 78–88 % und bis 86 %. Die Besetzung entscheidet mehr als die Auswahl." },
  { id: "jcurve", when: (o) => o.q >= 2 && o.c.margin < (o.c.hist[0] ? o.c.hist[0].mg : 0) && o.c.plat > 1.4,
    t: "Die Marge liegt unter dem Einstiegsniveau, obwohl der Reifegrad steigt. Das ist die <b>J-Kurve</b>: Umsetzungskosten fallen sofort an, der Ertrag kommt mit Verzögerung. Der Anlauf kostet in der ersten zusammenhängenden Periode voll, danach nur noch halb — durchlaufen zu lassen ist billiger als stoppen und neu starten. Wer hier abbricht, hat nur bezahlt." },
  { id: "relfail", when: (o) => o.news.some((n) => n.e === "➖"),
    t: "Zielverfehlung, kein Totalausfall: verlässliche Maßnahmen scheitern nicht binär, sie <b>unterliefern</b>. Ein Cost-out-Programm bringt eben nur 3 statt 5 Prozent — das entspricht der Praxis deutlich besser als ein Münzwurf." },
  { id: "hardfail", when: (o) => o.news.some((n) => n.e === "❌"),
    t: "Diese Maßnahme ist gescheitert und hat trotzdem gekostet. Transformations- und marktabhängige Programme kennen keine Teillieferung: entweder der volle Gewinn oder nichts. Mit einem starken Team liegen sie bei 70–90 %, mit einem schwachen unter 60 % — die Besetzung entscheidet mehr als die Auswahl." },
  { id: "stack", when: (o) => o.c.plat >= 3.2 || o.c.acc >= 3.2,
    t: "Ein Reifegrad steht über 3. Erreichte Stufen <b>bleiben</b> — abgeschlossene Programme zahlen dauerhaft ein. Nur bringt jede weitere Stufe über dem Branchenniveau weniger als die davor. Ab hier lohnt es oft mehr, die schwächere Dimension nachzuziehen als die starke weiter auszubauen." },
  { id: "over", when: (o) => overstretch(o.c) > 0,
    t: "<b>Überdehnung.</b> Dein Growth-Reifegrad ist höher, als People und Performance ihn tragen. Nur der gedeckelte Teil wirkt, der Rest kostet 1,4 pp Marge und drückt die Assetqualität. Genau dieser Fehlermodus — skalieren ohne Unterbau — beschäftigt Operating Partner in der Praxis am häufigsten." },
  { id: "gp", when: (o) => growthPrem(o.c) >= 0.08,
    t: "Deine Umsatz-CAGR liegt über dem Sektor, und das zahlt jetzt <b>direkt aufs Multiple</b> — bis zu +35 %. Wachstum ist empirisch der größte Werthebel der Assetklasse, vor Multiple-Expansion und deutlich vor Margenverbesserung. Es wirkt nur langsamer als ein Kostenprogramm." },
  { id: "oplev", when: (o) => opLeverage(o.c) >= 0.5,
    t: "<b>Operating Leverage</b>: der Umsatz wächst schneller als die Kostenbasis, die Zielmarge steigt mit. Wachstum und Marge sind keine Gegner — wachsende Unternehmen weiten ihre Marge häufiger aus als schrumpfende." },
  { id: "founder", when: (o) => o.news.some((n) => n.e === "👋"),
    t: "Der Gründer-CEO ist raus. Die Flagge <b>Nachfolgesituation</b> im Deal war genau dieses Risiko — sie drückt den Einstiegspreis, weil sie dich zu einer Besetzung zwingt, deren Ausgang du beim Kauf nicht kennst." },
  { id: "lev", when: (o) => o.c.netDebt / Math.max(0.5, ebitdaOf(o.c)) > (o.c.covLimit ?? 6.5) - 0.5,
    t: "Der Leverage nähert sich dem <b>Covenant</b>. Zwei Perioden darüber und die Kreditgeber vollstrecken — das Eigenkapital wird ausgebucht, unabhängig davon, wie gut die operative Story ist. Entschuldung ist hier kein Nebeneffekt, sondern Risikomanagement." },
  { id: "ceil", when: (o) => o.c.plat > 3 || o.c.acc > 3,
    t: "Über Reifegrad 3 greift die <b>Sättigung</b>: jede weitere Maßnahme bringt weniger, der Verfall wird gleichzeitig steiler. Ab hier lohnt oft die andere Dimension mehr als die nächste Stufe auf derselben." },
  { id: "idle", when: (o) => !anyInit(o.c) && !(o.c.searches || []).length && o.q >= 2,
    t: "Eine Periode ohne Maßnahme und ohne Search. Deine <b>Umsetzungskapazität</b> verfällt ungenutzt, während Zinsen und Verfall weiterlaufen. Leerlauf ist im Portfolio die teuerste Entscheidung, weil sie sich nicht wie eine anfühlt." },
  { id: "exit", when: (o) => o.q >= PRAC_EXIT_FROM,
    t: "Ab jetzt liegt jede Periode ein <b>Verkaufsangebot</b> auf dem Tisch. Der Multiple steigt in aller Regel weiter — die Frage ist nicht, ob mehr drin wäre, sondern ob das zusätzliche Halbjahr die Verzinsung trägt. Faustregel: Solange der erwartete Wertzuwachs über deiner Zielrendite liegt, halten; darunter verkaufen und das Kapital neu einsetzen. Genau daran scheitern in der Partie die meisten Fonds — sie verkaufen zu spät, weil der Multiple noch steigt." },
  { id: "mep", when: (o) => !o.c.ltip && o.q >= 3,
    t: "Die <b>Managementbeteiligung</b> ist noch nicht aufgesetzt. 6 % Sweet Equity vom Exiterlös kosten dich am Ende Geld — halbieren aber das Retention-Risiko und heben jedes effektive Rating um 0,5. Bei langer Halteperiode rechnet sich das fast immer." },
];

function PracticeMode({ dark, setDark, back }) {
  const [c, setC] = useState(null);
  const [q, setQ] = useState(0);
  const [feed, setFeed] = useState([]);
  const [seen, setSeen] = useState([]);
  const [sl, setSl] = useState([]);
  const [initPick, setInitPick] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [over, setOver] = useState(null);
  /* Kontrollrechnung: dieselbe Beteiligung, unangetastet gehalten. Der Übende
     tritt nicht gegen 1,0× an, sondern gegen das, was Entschuldung und
     Cashflow ohne jedes Zutun ohnehin liefern — genau die Frage, die im
     Investment Committee gestellt wird.                                      */
  const [shadow, setShadow] = useState(null);
  /* Der geführte Durchlauf läuft in drei Phasen: Dealflow (prüfen, bieten),
     Halteperiode (besetzen, Programme, Ergebnisse) und Exit (Prozess, Angebot,
     Verwendung des Erlöses). Der Coach begleitet jeden Schritt und markiert das
     Feld, auf das getippt werden muss.                                       */
  const [phase, setPhase] = useState("deal");
  const [deals, setDeals] = useState([]);
  const [dd, setDd] = useState({});
  const [bid, setBidState] = useState(null);
  const [proc, setProc] = useState(null);
  const [offer, setOffer] = useState(null);
  const [prog, setProg] = useState(0);
  const market = useMemo(practiceMarket, []);

  useEffect(() => { if (!c) reset(); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [q]);

  function reset() {
    seedTo(20260601);
    setPhase("deal"); setDd({}); setBidState(null); setProc(null); setOffer(null);
    setDeals([practiceDeal("prop"), practiceDeal("process")]);
    setProg(0);
    setC(null); setShadow(null);
    setQ(0); setSl([]); setInitPick(null); setSheet(null); setOver(null); setSeen([]);
    setFeed([{
      q: 0, e: "🎓", tone: "tip",
      t: "<b>Übungsmodus.</b> Eine Beteiligung, zehn Halbjahre, dieselbe Value-Creation-Logik wie in der Partie. Die Marktmultiples sind eingefroren — was du am Ende siehst, ist ausschließlich deine eigene Wertschöpfung, ohne Rückenwind vom Markt.",
    }, {
      q: 0, e: "📋", tone: "tip",
      t: "Der Fall: Sondermaschinenbau, 70 Mio. € Umsatz, Marge auf Benchmark, gekauft zu 8,6× mit 2,2× Leverage. <b>Performance 1,2</b> und <b>Growth 1,3</b> liegen beide unter Branchenniveau, der <b>CFO ist vakant</b>, und der CEO ist ein Gründer kurz vor dem Rückzug. Drei Baustellen, zwei Slots — du kannst nicht alles gleichzeitig.",
    }]);
  }

  const freeSlots = c ? PRAC_SLOTS - initsOf(c).length : 0;

  function patch(p) { setC((h) => ({ ...h, ...p })); }

  function startSearch(seat) {
    haptic(8);
    const nm = seat === "ceo" ? "CEO" : seat === "cfo" ? "CFO" : ROLE3[c.sector].n;
    patch({ netDebt: c.netDebt + retainerOf(seat, ebitdaOf(c)),
      searches: [...(c.searches || []), { seat, readyQ: q + 1 }] });
    setFeed((p) => [{ q, e: "🔍", tone: "neu", t: `<b>${c.name}</b>: Search-Mandat für einen neuen ${nm} erteilt — Retainer ${eur(retainerOf(seat, ebitdaOf(c)))}.` }, ...p]);
  }

  function hire(item, cand) {
    haptic(10);
    const had = c[item.seat].skill > 0;
    const nm = item.seat === "ceo" ? "CEO" : item.seat === "cfo" ? "CFO" : ROLE3[c.sector].n;
    patch({
      [item.seat]: { skill: cand.skill, dev: cand.dev, poach: cand.poach }, onboard: 1,
      searches: (c.searches || []).filter((se) => se.seat !== item.seat),
      netDebt: c.netDebt + signBonusOf(item.seat, cand.skill, ebitdaOf(c))
        + (had ? severanceOf(item.seat, c[item.seat].skill, ebitdaOf(c)) : 0),
    });
    setSl((p) => p.slice(1));
    setFeed((p) => [{ q, e: "🤝", tone: "pos", t: `<b>${c.name}</b>: Neuer ${nm} an Bord — Rating ${cand.skill.toFixed(1)}, Signing Bonus ${eur(signBonusOf(item.seat, cand.skill, ebitdaOf(c)))}, Gehalt ${eur(payOf(item.seat, cand.skill, ebitdaOf(c)))} p.a.${had ? " Plus zwölf Monatsgehälter Abfindung für den Vorgänger." : ""}` }, ...p]);
  }

  function reject(item) {
    patch({ netDebt: c.netDebt + retainerOf(item.seat, ebitdaOf(c)) * 0.5,
      searches: (c.searches || []).map((se) => se.seat === item.seat ? { seat: item.seat, readyQ: q + 1 } : se) });
    setSl((p) => p.slice(1));
    setFeed((p) => [{ q, e: "🔍", tone: "neu", t: `<b>${c.name}</b>: Shortlist abgelehnt, Suchmandat wird neu aufgesetzt.` }, ...p]);
  }

  function startInit(dim, id) {
    haptic(8);
    const spec = initById(dim, id);
    if (initRuns(c, id) >= REPEAT_MAX) return;
    const seat = dim === "plat" ? "cfo" : "r3";
    const E = effSkill(c, seat) * (c.onboard > 0 ? 0.7 : 1);
    const dur = Math.max(1, initDur(E) + (spec.dm || 0));
    const p = clamp(initSuccess(E, spec.cls) + (spec.sm || 0), 0.1, 0.97);
    const ok = rnd() < p;
    const sp = spec.spread ? spec.spread[0] + rnd() * (spec.spread[1] - spec.spread[0])
      : dim === "acc" ? ACC_SPREAD[0] + rnd() * (ACC_SPREAD[1] - ACC_SPREAD[0]) : 1;
    let pt = { drag: spec.drag || 0, cx: spec.cx || 0, nwcRun: spec.nwcRun || 0 };
    let debt = ebitdaOf(c) * (spec.oneOff || 0), msg = "";
    if (spec.ma) {
      const chk = addonCheck(c, market);
      if (!chk.ok) {
        setFeed((f2) => [{ q, e: "🏦", tone: "neg", t: `<b>${c.name}</b>: Der Zukauf scheitert an der Finanzierung. Pro forma ${x(chk.lev)} Leverage gegen einen Covenant von ${x(chk.limit)} — die Banken steigen aus.` }, ...f2]);
        return;
      }
      debt += chk.price;
      pt = { ...pt, ma: true, addEb: chk.addEb, mult: chk.mult, price: chk.price, gain: 1.0, ok };
      msg = ` Add-on mit ${eur(chk.addEb)} EBITDA zu ${x(chk.mult)} für ${eur(chk.price)}, fremdfinanziert. Leverage pro forma ${x(chk.lev)}. Integrationswahrscheinlichkeit ${Math.round(p * 100)} %.`;
    } else {
      pt = { ...pt, gain: initGain(E) * sp * (spec.gm || 1) * ceilingFactor(dim === "plat" ? c.plat : c.acc), ok };
      msg = ` Erfolgswahrscheinlichkeit ${Math.round(p * 100)} %, ${hj(dur)}.${spec.oneOff ? ` Einmalaufwand ${eur(ebitdaOf(c) * spec.oneOff)}.` : ""}`;
    }
    patch({ netDebt: c.netDebt + debt, [dim === "plat" ? "initP" : "initA"]: { dim, id, name: spec.n, doneQ: q + dur, ...pt } });
    setFeed((f2) => [{ q, e: spec.ma ? "🏢" : "🛠️", tone: "neu", t: `<b>${c.name}</b>: ${spec.n} gestartet.${msg}` }, ...f2]);
  }

  /* Benchmarkstudie: dieselbe Mechanik wie in der Partie, nur wird sie hier
     nicht aus der Fondsliquidität bezahlt — der Übungsmodus kennt keinen Fonds.
     Die Kosten laufen wie alle Beratungskosten über die Beteiligung.        */
  /* Zuschlag: dieselbe Konstruktion wie in der Partie, nur ohne Wettbewerber.
     Ohne Datenraum greift dasselbe Informationsrisiko wie dort.             */
  function closeDeal(d, mult, lev) {
    haptic(14);
    const co = makePracticeCo(d, mult, lev, !!dd[d.id]);
    setC(co); setShadow(JSON.parse(JSON.stringify(co)));
    setPhase("run");
    setFeed((p) => [{
      q: 0, e: "🤝", tone: "pos",
      t: `Zuschlag für <b>${co.name}</b> bei ${x(mult)} EBITDA — Eigenkapital ${eur(co.entryEquity)}, Fremdkapital ${x(lev)}.${co.hit ? " Nach dem Closing zeigt sich, was der Datenraum verhindert hätte: die Marge liegt niedriger als im Verkaufsmemorandum." : ""} Jetzt beginnt die Halteperiode.`,
    }, ...p]);
  }

  function runDD(d) {
    haptic(8);
    setDd((p) => ({ ...p, [d.id]: true }));
    setFeed((p) => [{ q: 0, e: "🔍", tone: "neu",
      t: `Datenraum zu <b>${d.name}</b> geöffnet (${eur(ddCostOf(d))}). Branchenreferenzen und die erwartete Performance gegenüber dem Markt liegen jetzt vor — und das Post-Closing-Risiko ist ausgeschlossen.` }, ...p]);
  }

  function runStudy() {
    const cost = DD_COST / 2;
    patch({ dd: true, netDebt: c.netDebt + cost });
    setFeed((p) => [{ q, e: "📊", tone: "neu",
      t: `<b>${c.name}</b>: Benchmarkstudie beauftragt (${eur(cost)}) — Branchenmarge ${pct(c.benchMargin)}, Marktwachstum ${pct(SECTORS[c.sector].g)}, typischer Capex ${pct(c.benchCapex)} vom Umsatz. Erst damit lässt sich beurteilen, wo dieses Unternehmen wirklich steht.` }, ...p]);
  }

  /* Vorzeitiger Verkauf. Ohne diese Möglichkeit trainiert der Übungsmodus
     genau die Gewohnheit, die die Wertung bestraft: durchhalten bis zum Ende,
     weil der Multiple ja noch steigt. Ab Halbjahr 6 liegt jede Periode ein
     Angebot auf dem Tisch — dieselbe Preisbildung wie in der Partie.        */
  function startProc() {
    haptic(12);
    setProc({ resolveQ: q + PROC_Q });
    setFeed((p) => [{ q, e: "📣", tone: "neu",
      t: `Verkaufsprozess für <b>${c.name}</b> eröffnet. Die Bank spricht Käufer an, der Datenraum wird aufbereitet — Gebote liegen in ${hj(PROC_Q)} vor. Bis dahin läuft das Unternehmen weiter, und du kannst weiter daran arbeiten.` }, ...p]);
  }

  function acceptOffer() {
    haptic(12);
    finishExit(c, q, shadow, q < PRAC_PERIODS);
    setOffer(null); setProc(null);
  }

  function toggleLtip() {
    patch({ ltip: true });
    setFeed((p) => [{ q, e: "📜", tone: "neu", t: `<b>${c.name}</b>: Managementbeteiligung (MEP) aufgesetzt — ${Math.round(LTIP_SHARE * 100)} % Sweet Equity, dafür halbes Retention-Risiko und +0,5 effektives Rating.` }, ...p]);
  }

  /* Periodenlauf — Reihenfolge identisch zur Partie */
  function step() {
    if (over || sl.length) return;
    haptic(14);
    const n = { ...c, ceo: { ...c.ceo }, cfo: { ...c.cfo }, r3: { ...c.r3 }, hist: [...c.hist] };
    const before = { plat: n.plat, acc: n.acc, nav: navValueOf(n, market), eb: ebitdaOf(n) };
    const nq = q + 1;
    const news = [], lists = [];

    /* Seed vor dem Periodenschritt sichern: die Kontrollrechnung muss exakt
       dieselben Umweltzüge ziehen (Wachstumsrauschen, Margenrauschen), sonst
       vergleicht man zwei verschiedene Welten statt zweier Entscheidungen.   */
    const seedBefore = seedGet();
    stepCompany(n, market, PRAC_ATTRS.operations);
    let hitEvent = null;
    if (rnd() < 0.15) {
      const pool = EVENTS.filter((e) => !e.ok || e.ok(n));
      if (pool.length) {
        const e = pick(pool);
        if (!(e.m && PRAC_ATTRS[e.m] >= 4 && rnd() < 0.5)) {
          hitEvent = e;
          e.f(n);
          const seat = e.t.startsWith("CEO") ? "ceo" : e.t.startsWith("CFO") ? "cfo" : null;
          news.push({ q: nq, e: e.bad ? (seat ? "🚪" : "🔻") : "🔺", tone: e.bad ? "neg" : "pos",
            t: `<b>${n.name}</b>: ${e.t}${seat ? " — die Position ist vakant." : ""}` });
        }
      }
    }
    maturePeople(n, market, nq, true, news, lists);

    /* Kontrollrechnung mitziehen: gleiche Ereignisse, aber keine Maßnahmen,
       keine Besetzungen, kein MEP. Eigener Zufallsstrang, damit der Schatten
       den Verlauf der echten Beteiligung nicht verschiebt.                   */
    let sh = null;
    if (shadow) {
      const keep = seedGet();
      seedTo(seedBefore);
      sh = { ...shadow, ceo: { ...shadow.ceo }, cfo: { ...shadow.cfo }, r3: { ...shadow.r3 }, hist: [...shadow.hist] };
      stepCompany(sh, market, PRAC_ATTRS.operations);
      // Vorbedingung erneut prüfen: das Ereignis traf die echte Beteiligung,
      // muss aber auf die Kontrollrechnung nicht zutreffen (etwa "Team zieht ein
      // Projekt vor", während dort gar keine Maßnahme läuft).
      if (hitEvent && (!hitEvent.ok || hitEvent.ok(sh))) hitEvent.f(sh);
      maturePeople(sh, market, nq, false, [], []);
      if (sh.netDebt < -0.5) { sh.cashOut = (sh.cashOut || 0) - sh.netDebt; sh.netDebt = 0; }
      sh.hist = [...sh.hist, { rev: sh.revenue, eb: ebitdaOf(sh), nd: sh.netDebt, mg: sh.margin, ql: sh.quality, eq: navValueOf(sh, market) }];
      seedTo(keep);
    }

    if ((n.breach || 0) >= 2) {
      news.push({ q: nq, e: "☠️", tone: "neg", t: `Covenant Breach bei <b>${n.name}</b>: Enforcement durch die Kreditgeber, das Eigenkapital wird ausgebucht.` });
      setOver({ net: 0, moic: 0, bridge: null });
    } else if ((n.breach || 0) === 1) {
      news.push({ q: nq, e: "⚠️", tone: "neg", t: `<b>${n.name}</b> reißt den Covenant von ${x(n.covLimit ?? 6.5)} bei ${x(n.netDebt / Math.max(0.5, ebitdaOf(n)))}. Noch ein Halbjahr bis zum Enforcement.` });
    }
    if (n.netDebt < -0.5) {
      const sweep = -n.netDebt;
      n.netDebt = 0; n.cashOut = (n.cashOut || 0) + sweep; n.recapOut = (n.recapOut || 0) + sweep;
      news.push({ q: nq, e: "💵", tone: "pos", t: `<b>${n.name}</b> kehrt ${eur(sweep)} Überschussliquidität aus — Nettoverschuldung bei null.` });
    }
    n.hist = [...n.hist, { rev: n.revenue, eb: ebitdaOf(n), nd: n.netDebt, mg: n.margin, ql: n.quality, eq: navValueOf(n, market) + (n.cashOut || 0) }];

    // Coach
    const ctx = { c: n, q: nq, before, news };
    const fresh = [];
    COACH.forEach((r) => {
      if (fresh.length >= 2 || seen.indexOf(r.id) >= 0) return;
      let hit = false;
      try { hit = r.when(ctx); } catch (err) { hit = false; }
      if (hit) fresh.push(r);
    });
    fresh.forEach((r) => news.push({ q: nq, e: "🎓", tone: "tip", t: r.t }));
    if (fresh.length) setSeen((p) => [...p, ...fresh.map((r) => r.id)]);

    /* Auflösung des Verkaufsprozesses. Die Gebote kommen aus demselben Preis,
       den auch der bilaterale Weg ergäbe — der Unterschied liegt im Wettbewerb
       unter den Käufern, der in der Partie über makeOffers abgebildet ist.   */
    if (proc && nq >= proc.resolveQ && (n.breach || 0) < 2) {
      const g2 = Math.max(0, eqvOf(n, dealMultiple(n, market, PRAC_ATTRS.negotiation)));
      const n2 = g2 * (1 - PROC_FEE) * (n.ltip ? 1 - LTIP_SHARE : 1);
      setOffer({ gross: g2, net: n2, moic: dealMoic(n, n2) });
      news.push({ q: nq, e: "📨", tone: "neu",
        t: `Gebote für <b>${n.name}</b> liegen vor: ${eur(n2)} netto, ${dealMoic(n, n2).toFixed(2)}× auf das eingesetzte Eigenkapital. Der Wettbewerb im Prozess hat den Preis über das getrieben, was ein bilateraler Zuruf gebracht hätte.` });
    }

    setC(n); setQ(nq); if (sh) setShadow(sh);
    if (lists.length) setSl((p) => [...p, ...lists]);
    setFeed((p) => [...news.reverse(), ...p].slice(0, 80));
    /* Läuft ein Prozess, wird am Laufzeitende nicht zwangsabgewickelt — das
       Gebot liegt dann vor und der Spieler entscheidet.                      */
    if (nq >= PRAC_PERIODS && (n.breach || 0) < 2 && !proc && !offer) finishExit(n, nq, sh);
  }

  function exitMoic(z) {
    if (!z) return null;
    const g = Math.max(0, eqvOf(z, dealMultiple(z, market, PRAC_ATTRS.negotiation)));
    return dealMoic(z, g * (1 - PROC_FEE) * (z.ltip ? 1 - LTIP_SHARE : 1));
  }

  /* Deal-IRR auf Halbjahresbasis: eine Auszahlung am Anfang, ein Rückfluss am
     Ende. Zwischenausschüttungen aus dem Cash Sweep werden vereinfachend dem
     Exitzeitpunkt zugerechnet — im Übungsmodus geht es um die Größenordnung,
     nicht um die dritte Nachkommastelle.                                     */
  function pracIrr(moic, holdQ) {
    if (!(moic > 0) || holdQ < 1) return 0;
    return Math.pow(moic, 2 / holdQ) - 1;
  }
  const pracScore = (moic, holdQ) =>
    0.5 * clamp(moic / TVPI_BENCH, -1, 4) + 0.5 * clamp(pracIrr(moic, holdQ) / IRR_BENCH, -1, 4);

  /* Die eigentliche Lektion beim vorzeitigen Verkauf: Was wäre gewesen, wenn
     man gehalten hätte? Dazu wird die Beteiligung ohne weitere Maßnahmen bis
     zum Laufzeitende fortgeschrieben — auf einem eigenen Zufallsstrang, damit
     die Gegenrechnung den tatsächlichen Verlauf nicht beeinflusst.          */
  function holdToEnd(n, nq) {
    if (nq >= PRAC_PERIODS) return null;
    const keep = seedGet();
    const z = { ...n, ceo: { ...n.ceo }, cfo: { ...n.cfo }, r3: { ...n.r3 }, hist: [...n.hist] };
    for (let t = nq; t < PRAC_PERIODS; t++) {
      stepCompany(z, market, PRAC_ATTRS.operations);
      if (rnd() < 0.15) {
        const pool = EVENTS.filter((e) => !e.ok || e.ok(z));
        if (pool.length) pick(pool).f(z);
      }
      maturePeople(z, market, t + 1, false, [], []);
      if (z.netDebt < -0.5) { z.cashOut = (z.cashOut || 0) + -z.netDebt; z.netDebt = 0; }
      z.hist = [...z.hist, { rev: z.revenue, eb: ebitdaOf(z), nd: z.netDebt, mg: z.margin, ql: z.quality, eq: navValueOf(z, market) }];
    }
    seedTo(keep);
    if ((z.breach || 0) >= 2) return { moic: 0, score: pracScore(0, PRAC_PERIODS) };
    const g = Math.max(0, eqvOf(z, dealMultiple(z, market, PRAC_ATTRS.negotiation)));
    const nt = g * (1 - PROC_FEE) * (z.ltip ? 1 - LTIP_SHARE : 1);
    const mo = dealMoic(z, nt);
    return { moic: mo, irr: pracIrr(mo, PRAC_PERIODS), score: pracScore(mo, PRAC_PERIODS) };
  }


  /* ---------- Der Coach ----------
     Der Fortschritt ist ein Zähler, keine Zustandsabfrage. Die erste Fassung
     prüfte Bedingungen wie "keine Performance-Maßnahme läuft" — die wird wieder
     wahr, sobald ein Programm fertig ist, und der Coach sprang zurück auf
     Schritt 6. Jetzt hakt jeder Schritt genau einmal ab und der Zähler geht nur
     vorwärts.                                                                */
  const GUIDE = [
    { id: "dd", spot: "dd", sat: () => Object.keys(dd).length > 0,
      eyebrow: "Dealflow", title: "Zwei Ziele, ein Prüfbudget",
      body: () => (<>
        <p>Oben steht ein Off-Market-Deal, darunter eine Auktion. Lies zuerst die Kennzahlen:</p>
        <dl>
          <Kpi t="EBITDA">Der Ertrag, auf den alles gerechnet wird. Kaufpreis und Verschuldung sind Vielfache davon.</Kpi>
          <Kpi t="Preiserwartung">Was der Verkäufer erwartet, in EBITDA-Vielfachen. Deine Verhandlungsbasis, keine Vorschrift.</Kpi>
          <Kpi t="Assetqualität">Marktstellung und Widerstandsfähigkeit, 10 bis 97. Sie treibt das Bewertungsmultiple beim Verkauf.</Kpi>
          <Kpi t="Debt Capacity">Wie viel Fremdkapital die Banken auf dieses Geschäftsmodell geben. Mehr Leverage heißt weniger Eigenkapital je Deal — und weniger Luft, wenn es schlecht läuft.</Kpi>
        </dl>
        <p className="why"><b>Tu jetzt das:</b> Beauftrage die Due Diligence beim oberen Deal. Sie kostet Geld, aber ohne Datenraum siehst du weder die Branchenreferenz noch die erwartete Performance gegenüber dem Markt — und trägst das volle Risiko, dass die Zahlen im Memorandum geschönt sind.</p>
      </>) },
    { id: "bid", spot: "bid", sat: () => !!bid,
      eyebrow: "Preis", title: "Der Einstiegspreis ist die wichtigste Zahl des Deals",
      body: () => (<>
        <p>Jetzt sind zwei Zeilen dazugekommen, die vorher fehlten:</p>
        <dl>
          <Kpi t="Erwartete Performance vs. Markt">Wächst dieses Unternehmen dauerhaft schneller oder langsamer als sein Sektor. Ein Punkt davon macht am Ende leicht 0,3× MOIC aus.</Kpi>
          <Kpi t="Branchenreferenz">Marge, Capex und Working Capital im Vergleich zum Sektor. Erst dadurch weißt du, wo Arbeit möglich ist.</Kpi>
        </dl>
        <p className="why"><b>Tu jetzt das:</b> Stell den Regler auf die Preiserwartung oder knapp darunter und gib das Angebot ab. Jeder Turn, den du zu viel zahlst, muss später durch operative Arbeit wieder verdient werden — und unter der Schmerzgrenze des Verkäufers kommt gar kein Abschluss zustande.</p>
      </>) },
    { id: "close", spot: "close", sat: () => phase === "run",
      eyebrow: "Vollzug", title: "Angebot liegt vor",
      body: () => <p className="why"><b>Tu jetzt das:</b> Schließ den Kauf ab. Danach beginnt die Halteperiode, und aus dem Ziel wird eine Beteiligung, an der du arbeitest.</p> },
    { id: "study", spot: "study", sat: () => !!(c && c.dd),
      eyebrow: "Bestandsaufnahme", title: "Zuerst wissen, wo das Unternehmen steht",
      body: () => (<>
        <p>Ohne Vergleichsmaßstab sagt eine Marge von {c ? pct(c.margin) : "—"} nichts. Erst die Branchenreferenz zeigt, ob das gut oder schlecht ist — und daran hängt, welche Maßnahme überhaupt etwas bringt.</p>
        <p className="why"><b>Tu jetzt das:</b> Beauftrage die Benchmarkstudie. Sie ist die billigste Entscheidung im ganzen Katalog und die Voraussetzung für alles Weitere.</p>
      </>) },
    { id: "hire", spot: "hire", sat: () => !!(c && (c.cfo.skill > 0 || (c.searches || []).some((se) => se.seat === "cfo"))),
      eyebrow: "Team", title: "Ohne CFO liefert kein Programm",
      body: () => (<>
        <p>Die CFO-Position ist vakant. Das effektive Rating dieser Rolle bestimmt drei Dinge zugleich: wie wahrscheinlich ein Performance-Programm gelingt, wie lange es dauert und wie viel es bringt.</p>
        <dl><Kpi t="Effektives Rating">Rating der Rolle, gedämpft während der Einarbeitung, gehoben durch die Managementbeteiligung.</Kpi></dl>
        <p className="why"><b>Tu jetzt das:</b> Starte den Search für den CFO. Er kostet Retainer und Antrittsprämie und dauert ein Halbjahr — aber ein Programm mit unbesetztem CFO ist verlorene Zeit.</p>
      </>) },
    { id: "ltip", spot: "ltip", sat: () => !!(c && c.ltip),
      eyebrow: "Anreize", title: "Managementbeteiligung aufsetzen",
      body: () => (<>
        <p>{Math.round(LTIP_SHARE * 100)} % Sweet Equity vom Exiterlös kosten dich am Ende Geld. Dafür halbiert sich das Risiko, dass dir Schlüsselpersonen wegbrechen, und jedes effektive Rating steigt um 0,5.</p>
        <p className="why"><b>Tu jetzt das:</b> Setz die MEP auf. Bei einer Halteperiode von mehreren Jahren rechnet sich das fast immer — und die Wirkung beginnt sofort, nicht erst beim Exit.</p>
      </>) },
    { id: "plat", spot: "plat", sat: () => !!(c && c.initP),
      eyebrow: "Performance", title: "Die erste Werkbank belegen",
      body: () => (<>
        <p>Performance und Growth laufen parallel, je eine Werkbank. Im Katalog steht bei jeder Maßnahme, ob sie zu diesem Fall passt:</p>
        <dl>
          <Kpi t="Eignung">Ob überhaupt ein Defizit da ist, an dem die Maßnahme ansetzen kann. Cost-out auf einer Marge über Branchenniveau bringt nichts.</Kpi>
          <Kpi t="Reifegrad">Wie weit diese Dimension ausgebaut ist, 0 bis 5. Über Stufe 3 bringt jede weitere Auflage spürbar weniger.</Kpi>
        </dl>
        <p className="why"><b>Tu jetzt das:</b> Öffne Performance und wähle die Maßnahme mit der höchsten Eignung. Programme mit geringer Eignung kosten Geld und Zeit und liefern kaum etwas — das Weglassen ist hier eine echte Entscheidung.</p>
      </>) },
    { id: "acc", spot: "acc", sat: () => !!(c && c.initA),
      eyebrow: "Growth", title: "Wachstum wirkt nur, soweit es getragen wird",
      body: () => (<>
        <p>Growth ist gedeckelt durch Team und Prozessreife: <b>wirksam ist der kleinste Wert aus Growth-Stufe, People + 1 und Performance + 1</b>. Alles darüber ist Überdehnung — es kostet Marge und Assetqualität, ohne zu wirken.</p>
        <p className="why"><b>Tu jetzt das:</b> Belege auch die zweite Werkbank. Wachstum ist empirisch der größte Werthebel der Assetklasse, wirkt aber langsamer als ein Kostenprogramm — deshalb früh anfangen.</p>
      </>) },
    { id: "hold", spot: "close", sat: () => q >= PRAC_EXIT_FROM,
      eyebrow: "Halteperiode", title: "Laufen lassen und beobachten",
      body: () => (<>
        <p>Beim Periodenschluss passiert alles auf einmal: Umsatz und Marge entwickeln sich, Zinsen laufen, Cashflow tilgt Schulden, Programme lösen sich auf. Verfolge dabei:</p>
        <dl>
          <Kpi t="Leverage vs. Covenant">Zwei Perioden über der Grenze und die Kreditgeber vollstrecken — dann ist das Eigenkapital weg, egal wie gut die operative Story war.</Kpi>
          <Kpi t="Cash Conversion">Was vom EBITDA nach Investitionen und Working Capital übrig bleibt. Sie entscheidet, wie schnell du entschuldest.</Kpi>
          <Kpi t="Total Value">NAV plus bereits ausgeschüttete Beträge, geteilt durch dein eingesetztes Eigenkapital.</Kpi>
        </dl>
        <p className="why"><b>Tu jetzt das:</b> Schließ die Halbjahre ab. Wird eine Werkbank frei, belege sie neu — Maßnahmen lassen sich wiederholen, jede weitere Auflage bringt aber weniger. Leerlauf ist die teuerste Entscheidung im Portfolio, weil sie sich nicht wie eine anfühlt.</p>
      </>) },
    { id: "proc", spot: "proc", sat: () => !!proc || !!offer || !!over,
      eyebrow: "Exit", title: "Wann verkaufen ist die eigentliche Frage",
      body: () => (<>
        <p>Der Multiple steigt in aller Regel weiter. Die Frage ist nicht, ob mehr drin wäre, sondern ob das zusätzliche Halbjahr die Verzinsung trägt.</p>
        <dl>
          <Kpi t="MOIC">Was aus jedem eingesetzten Euro geworden ist. Steigt mit der Haltedauer fast immer weiter.</Kpi>
          <Kpi t="IRR">Wie schnell er zurückkam. Sinkt mit jedem Halbjahr, in dem das Kapital gebunden bleibt.</Kpi>
        </dl>
        <p className="why"><b>Tu jetzt das:</b> Eröffne den Verkaufsprozess. Er dauert {hj(PROC_Q)} — in dieser Zeit läuft das Unternehmen weiter, und du kannst weiter daran arbeiten. Faustregel: Solange der erwartete Wertzuwachs über deiner Zielrendite liegt, halten; darunter verkaufen.</p>
      </>) },
    { id: "wait", spot: "close", sat: () => !!offer || !!over,
      eyebrow: "Prozess läuft", title: "Bis zu den Geboten weiterarbeiten",
      body: () => <p className="why"><b>Tu jetzt das:</b> Schließ die Halbjahre ab. Ein laufender Prozess hindert dich nicht daran, weiter am Unternehmen zu arbeiten — im Gegenteil, jede Verbesserung bis zum Signing zahlt auf den Preis ein.</p> },
    { id: "accept", spot: "accept", sat: () => !!over,
      eyebrow: "Angebot", title: "Der Erlös und was danach damit passiert",
      body: () => (<>
        <p>Vom Bruttoerlös gehen {Math.round(PROC_FEE * 100)} % Transaktionskosten ab, dazu die Managementbeteiligung. Was übrig bleibt, fließt in der Partie an den Fonds — und dort entscheidest du, ob es an die Investoren zurückgeht oder für den nächsten Deal im Fonds bleibt.</p>
        <p className="why"><b>Tu jetzt das:</b> Nimm das Angebot an. Danach siehst du die Value Bridge: welcher Teil des Ergebnisses aus EBITDA-Wachstum kam, welcher aus dem Multiple, welcher aus Entschuldung — und was dieselbe Beteiligung gebracht hätte, wenn du sie nie angefasst hättest.</p>
      </>) },
  ];

  /* Der Zähler geht nur vorwärts und überspringt Schritte, die beim Aufrufen
     schon erledigt sind — wer den CFO vor der Benchmarkstudie besetzt, wird
     nicht zurückgeschickt.                                                   */
  useEffect(() => {
    let i = prog;
    while (i < GUIDE.length && GUIDE[i].sat()) i++;
    if (i !== prog) setProg(i);
  });

  function guide() {
    if (over || prog >= GUIDE.length) return null;
    const g = GUIDE[prog];
    return { step: prog + 1, total: GUIDE.length, spot: g.spot,
      eyebrow: `Schritt ${prog + 1} — ${g.eyebrow}`, title: g.title, body: g.body() };
  }

  function finishExit(n, nq, sh, early) {
    // Exit über einen strukturierten Prozess: kein Kanalabschlag, damit in der
    // Value Bridge ausschließlich die eigene Arbeit sichtbar wird.
    const gross = Math.max(0, eqvOf(n, dealMultiple(n, market, PRAC_ATTRS.negotiation)));
    const net = gross * (1 - PROC_FEE) * (n.ltip ? 1 - LTIP_SHARE : 1);
    const bridge = makeBridge(n, gross, net);
    const moic = dealMoic(n, net);
    const base = exitMoic(sh);
    const held = early ? holdToEnd(n, nq) : null;
    setOver({ net, moic, bridge, base, holdQ: nq, early: !!early, held,
      irr: pracIrr(moic, nq), score: pracScore(moic, nq),
      baseScore: base != null ? pracScore(base, nq) : null });
    setSheet({ kind: "bridge", c: n, price: net, buyer: "Strategischer Käufer", bridge });
    setFeed((p) => [{
      q: nq, e: "🎓", tone: "tip",
      t: `<b>Fazit.</b> ${moic.toFixed(2)}× nach ${hj(nq)} — ${(pracIrr(moic, nq) * 100).toFixed(0)} % IRR, Wertung ${pracScore(moic, nq).toFixed(2)}.${held ? ` Hättest du bis zum Laufzeitende gehalten, ohne weiter einzugreifen: ${held.moic.toFixed(2)}× bei ${(held.irr * 100).toFixed(0)} % — Wertung ${held.score.toFixed(2)}. ${held.score > pracScore(moic, nq) ? "Zu früh verkauft: die verbleibende Wertsteigerung war den zusätzlichen Zeitaufwand wert." : "Richtig verkauft: der Multiple wäre zwar weiter gestiegen, aber langsamer als dein Kapital anderswo verdient."}` : ""} ${moic.toFixed(2)}× auf das eingesetzte Eigenkapital${(n.recapOut || 0) > 0.5 ? ` — davon ${eur(n.recapOut)} bereits während der Haltezeit ausgeschüttet, der Rest beim Exit` : ""}.${base != null ? ` Dieselbe Beteiligung unangetastet gehalten: <b>${base.toFixed(2)}×</b> — allein aus Entschuldung und Cashflow. Deine Arbeit hat ${moic >= base ? "" : "−"}${Math.abs(Math.round((moic - base) * 100))} Prozentpunkte ${moic >= base ? "hinzugefügt" : "gekostet"}. Genau diese Frage stellt das Investment Committee: Was wäre ohne dich passiert?` : ""} Lies die Value Bridge von oben nach unten: Der <b>EBITDA-Balken</b> ist deine operative Arbeit, <b>Multiple-Expansion</b> kommt hier ausschließlich aus Assetqualität und Wachstumsprämie — der Markt stand still. <b>Entschuldung</b> ist der Cashflow, den das Unternehmen selbst erwirtschaftet hat. Der Kostenbalken ist der Teil, den du nie zurückverdienst.`,
    }, ...p]);
  }

  const G = guide();

  /* Dealflow: eigener Bildschirm, damit der Kauf nicht zwischen Portfolioarbeit
     untergeht. Fondsobjekt nur so weit, wie die Dealkarte es braucht.        */
  if (phase === "deal") {
    const meStub = { holdings: [], undrawn: CAPITAL, recyc: 0, cash: CAPITAL, attrs: PRAC_ATTRS };
    return (
      <CoachCtx.Provider value={G && G.spot}>
        <div className={"pel" + (dark ? " dark" : "")}><style>{CSS}</style>
          <div className="bar">
            <div className="barrow">
              <div>
                <div className="stat">Übungsmodus · Dealflow</div>
                <div className="statv mono">{eur(CAPITAL)} <span style={{ fontSize: 11, opacity: .6 }}>Dry Powder</span></div>
              </div>
              <button className="theme" onClick={() => { haptic(6); setDark(!dark); }} aria-label="Darstellung wechseln">
                {dark ? "☀" : "☾"}
              </button>
            </div>
          </div>
          <div className="wrap">
            {G && <Coach {...G}>{G.body}</Coach>}
            {deals.map((d) => (
              <DealCard key={d.id} d={d} me={meStub} bid={bid && bid.id === d.id ? bid : null}
                dd={!!dd[d.id]} onDD={() => runDD(d)} market={market} quarter={0}
                ddUsed={Object.keys(dd).length} ddCap={ddCapOf(PRAC_ATTRS.analysis)}
                setBid={(b2) => setBidState({ id: d.id, ...b2 })} clear={() => setBidState(null)} />
            ))}
            {bid && (
              <div style={{ margin: "8px 16px 40px" }}>
                <button className={"solid cta-big" + (G && G.spot === "close" ? " spot" : "")}
                  style={{ width: "100%", padding: 14 }}
                  onClick={() => { const d = deals.find((x2) => x2.id === bid.id); closeDeal(d, bid.mult, bid.lev); }}>
                  Kauf abschließen
                </button>
              </div>
            )}
            <div style={{ margin: "0 16px 40px" }}>
              <button style={{ width: "100%" }} onClick={back}>Zurück zum Briefing</button>
            </div>
          </div>
        </div>
      </CoachCtx.Provider>
    );
  }

  if (!c) return null;
  const nav = navValueOf(c, market), moic = (nav + (c.cashOut || 0)) / c.costTotal;
  const offerGross = Math.max(0, eqvOf(c, dealMultiple(c, market, PRAC_ATTRS.negotiation)));
  const offerNet = offerGross * (1 - PROC_FEE) * (c.ltip ? 1 - LTIP_SHARE : 1);
  const offerMoic = dealMoic(c, offerNet);

  return (
    <CoachCtx.Provider value={G && G.spot}>
    <div className={"pel" + (dark ? " dark" : "")}><style>{CSS}</style>
      <div className="bar">
        <div className="barrow">
          <div>
            <div className="stat">Übungsmodus · Jahr {Math.floor(q / 2) + 1} · H{(q % 2) + 1}</div>
            <AnimatedNumber className="statv mono" value={moic}
              format={(v) => <>{v.toFixed(2)}× <span style={{ fontSize: 11, opacity: .6 }}>MOIC</span></>} />
            {q > 0 && (
              <div className="mono" style={{ fontSize: 11, opacity: .6, marginTop: 2 }}>
                bei Verkauf jetzt: {(pracIrr(moic, q) * 100).toFixed(0).replace("-", "−")} % IRR ·
                {" "}Wertung {pracScore(moic, q).toFixed(2)}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="theme" onClick={() => { haptic(6); setDark(!dark); }} aria-label="Darstellung wechseln">
              {dark ? "☀" : "☾"}
            </button>
          </div>
        </div>
        <div className="barrow" style={{ marginTop: 4, fontSize: 11, opacity: .6 }}>
          <span className="mono">NAV {eur(navValueOf(c, market))}
            {shadow && q > 0 ? ` · unangetastet ${((navValueOf(shadow, market) + (shadow.cashOut || 0)) / shadow.costTotal).toFixed(2)}×` : ""}</span>
          <span className="mono">{freeSlots}/{PRAC_SLOTS} Kapazität · HJ {q}/{PRAC_PERIODS}</span>
        </div>
        <div className="prog"><i style={{ width: `${(q / PRAC_PERIODS) * 100}%` }} /></div>
      </div>

      <div className="wrap">
        {G && <Coach {...G}>{G.body}</Coach>}
        <News feed={feed} quarter={q} practice />

        {over && (
          <div className="tomb">
            <div className="sub">Übung abgeschlossen</div>
            <div className="amt">{over.moic.toFixed(2)}×</div>
            <div className="sub">
              {over.bridge ? "auf das eingesetzte Eigenkapital" : "Totalverlust nach Covenant Breach"}
            </div>
            <div className="sub" style={{ marginTop: 6 }}>
              nach {hj(over.holdQ)} · {(over.irr * 100).toFixed(0).replace("-", "−")} % IRR · Wertung {over.score.toFixed(2)}
            </div>
            {over.base != null && (
              <div className="sub" style={{ marginTop: 6, color: over.moic >= over.base ? "var(--teal)" : "var(--ox)" }}>
                Unangetastet gehalten: {over.base.toFixed(2)}× · Delta {over.moic >= over.base ? "+" : "−"}
                {Math.abs(Math.round((over.moic - over.base) * 100))} pp
              </div>
            )}
            {over.held && (
              <div className="sub" style={{ marginTop: 6, color: over.score >= over.held.score ? "var(--teal)" : "var(--ox)" }}>
                Bis zum Ende gehalten wären es {over.held.moic.toFixed(2)}× bei {(over.held.irr * 100).toFixed(0)} % gewesen —
                Wertung {over.held.score.toFixed(2)}
              </div>
            )}
          </div>
        )}

        <Holding c={c} market={market} neg={PRAC_ATTRS.negotiation} quarter={q}
          procCount={0} freeSlots={over ? 0 : freeSlots} practice
          act={{
            proc: () => {}, bil: () => {}, cv: () => {}, ipo: () => {},
            search: (seat) => startSearch(seat), init: (dim) => setInitPick({ dim }), ltip: toggleLtip,
            study: c.dd ? null : runStudy,
          }} />

        <div className="card">
          <h3 className="disp">Archiv</h3>
          {feed.filter((f) => f.q < q).length === 0 && <div className="quiet">Noch keine älteren Meldungen.</div>}
          {feed.filter((f) => f.q < q).slice(0, 20).map((f, i) => (
            <div className={"item " + (f.tone || "neu")} key={i}>
              <span className="em">{f.e || "·"}</span>
              <span dangerouslySetInnerHTML={{ __html: `<span class="mono" style="opacity:.5">HJ ${f.q}</span> ${f.t}` }} />
            </div>
          ))}
        </div>

        {!over && !offer && q >= PRAC_EXIT_FROM && !proc && (
          <div className="card">
            <h3 className="disp">Exit vorbereiten</h3>
            <p className="hint" style={{ marginTop: 4 }}>
              Bei sofortigem Verkauf stünden {offerMoic.toFixed(2).replace(".", ",")}× auf dem Papier —
              {" "}{(pracIrr(offerMoic, q) * 100).toFixed(0).replace("-", "−")} % IRR, Wertung {pracScore(offerMoic, q).toFixed(2).replace(".", ",")}.
              Ein strukturierter Prozess braucht {hj(PROC_Q)}, bringt aber Wettbewerb unter die Käufer
              und damit den besseren Preis als ein bilateraler Zuruf.
            </p>
            <button className={"solid" + (G && G.spot === "proc" ? " spot" : "")}
              style={{ width: "100%", marginTop: 10 }} disabled={sl.length > 0} onClick={startProc}>
              📣 Verkaufsprozess eröffnen
            </button>
          </div>
        )}
        {!over && proc && !offer && (
          <div className="card">
            <h3 className="disp">Verkaufsprozess läuft</h3>
            <p className="hint" style={{ marginTop: 4 }}>
              Gebote in {hj(Math.max(0, proc.resolveQ - q))}. Das Unternehmen läuft weiter — jede
              Verbesserung bis zum Signing zahlt auf den Preis ein.
            </p>
          </div>
        )}
        {!over && offer && (
          <div className="card">
            <h3 className="disp">Gebot eingegangen</h3>
            <table className="kv"><tbody>
              <tr><td className="lab">Bruttoerlös</td><td>{eur(offer.gross)}</td></tr>
              <tr><td className="lab">Transaktionskosten</td><td>− {eur(offer.gross * PROC_FEE)}</td></tr>
              {c.ltip && <tr><td className="lab">Managementbeteiligung</td>
                <td>− {eur(offer.gross * (1 - PROC_FEE) * LTIP_SHARE)}</td></tr>}
              <tr><td className="lab">Nettoerlös an den Fonds</td>
                <td style={{ fontWeight: 600 }}>{eur(offer.net)}</td></tr>
              <tr><td className="lab">Ergebnis</td>
                <td style={{ color: offer.moic >= 1 ? "var(--teal)" : "var(--ox)", fontWeight: 600 }}>
                  {offer.moic.toFixed(2).replace(".", ",")}× · {(pracIrr(offer.moic, q) * 100).toFixed(0).replace("-", "−")} % IRR
                  · Wertung {pracScore(offer.moic, q).toFixed(2).replace(".", ",")}</td></tr>
            </tbody></table>
            <button className={"solid" + (G && G.spot === "accept" ? " spot" : "")}
              style={{ width: "100%", marginTop: 10 }} onClick={acceptOffer}>
              🤝 Annehmen · {eur(offer.net)}
            </button>
          </div>
        )}

        <div style={{ margin: "18px 16px 8px" }}>
          {!over ? (
            <button className={"solid cta-big" + (G && G.spot === "close" ? " spot" : "")}
              style={{ width: "100%", padding: 14 }}
              disabled={sl.length > 0} onClick={step}>
              {sl.length > 0 ? "Erst die Shortlist entscheiden" : "Halbjahr abschließen"}
            </button>
          ) : (
            <button className="solid" style={{ width: "100%", padding: 14 }} onClick={reset}>
              Übung wiederholen
            </button>
          )}
        </div>
        <div style={{ margin: "0 16px 40px" }}>
          <button style={{ width: "100%" }} onClick={back}>Zurück zum Briefing</button>
        </div>
      </div>

      {sheet && <Sheet sheet={sheet} close={() => setSheet(null)} onConfirm={() => setSheet(null)} />}
      {initPick && (
        <InitPicker c={c} dim={initPick.dim} market={market}
          start={(id) => { startInit(initPick.dim, id); setInitPick(null); }} close={() => setInitPick(null)} />
      )}
      {!sheet && !initPick && sl.length > 0 && (
        <Shortlist item={sl[0]} holding={c} analysis={PRAC_ATTRS.analysis} hire={hire} reject={reject} />
      )}
    </div>
    </CoachCtx.Provider>
  );
}

function Sheet({ sheet, close, onConfirm }) {
  if (sheet.kind === "confirm") {
    const TITLE = { bil: "Bilateraler Verkauf (Off-Market)", cv: "Single-Asset Continuation Vehicle", ipo: "Börsengang", proc: "Verkaufsprozess einleiten" };
    return (
      <div className="modal" onClick={close}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <div className="card lm" style={{ marginTop: 14 }}>
            <h3 className="disp">{TITLE[sheet.ch]}</h3>
            <div className="pad" style={{ paddingBottom: 6, fontSize: 13, color: "var(--ink2)" }}>{sheet.c.name}</div>
            <table className="ledger"><tbody>
              {sheet.rows.map(([l, v], i) => <tr key={i}><td className="lab">{l}</td><td>{v}</td></tr>)}
              {sheet.net > 0 && (
                <tr><td className="lab" style={{ fontWeight: 600 }}>Nettoerlös an den Fonds</td>
                  <td style={{ fontWeight: 700 }}>{eur(sheet.net)}</td></tr>
              )}
            </tbody></table>
            <div className="pad" style={{ paddingTop: 12 }}>
              {sheet.net > 0 && (
                <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                  <div>
                    <div className="eyebrow">{sheet.moicLabel || "MOIC (Deal)"}</div>
                    <div className="mono" style={{ fontSize: 19, color: sheet.moic >= 1 ? "var(--teal)" : "var(--ox)" }}>
                      {sheet.moic.toFixed(2)}×
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow">Nettoerlös an den Fonds</div>
                    <div className="mono" style={{ fontSize: 19, color: "var(--gold)" }}>{eur(sheet.net)}</div>
                  </div>
                </div>
              )}
              <p style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.5, margin: "0 0 14px" }}>{sheet.note}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1 }} onClick={close}>Zurück</button>
                <button className="solid" style={{ flex: 1 }} onClick={onConfirm}>Freigeben</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const b = sheet.bridge;
  const steps = [
    { l: "Equity Ticket (Einstieg)", v: b.entry },
    { l: "EBITDA-Wachstum", v: b.ebitda },
    { l: "Multiple-Expansion", v: b.mult },
    { l: "Entschuldung (Cash Generation)", v: b.delev },
    { l: "Transaktionskosten & Abschläge", v: b.cost },
  ];
  if ((b.dist || 0) > 0.05) steps.push({ l: "Rekapitalisierungen während der Haltezeit", v: b.dist });
  const N = steps.length;
  const totalOut = sheet.price + (b.dist || 0);
  const total = Math.max(b.entry, totalOut, 1);
  let run = 0;
  const H = 26;

  return (
    <div className="modal" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="tomb">
          <div className="sub">Exit an {sheet.buyer}</div>
          <div className="amt">{(totalOut / b.entry).toFixed(2)}×</div>
          <div className="sub">{sheet.c.name} · {eur(sheet.price)}{(b.dist || 0) > 0.05 ? ` + ${eur(b.dist)} Ausschüttungen` : ""}</div>
        </div>
        <div className="card">
          <h3 className="disp">Verlauf</h3>
          <Track c={sheet.c} />
        </div>
        <div className="card">
          <h3 className="disp">Value Bridge</h3>
          <div className="pad">
            <svg viewBox={`0 0 300 ${H * (N + 1) + 16}`} style={{ width: "100%" }}>
              {steps.map((s, i) => {
                const w = (Math.abs(s.v) / total) * 190;
                const start = i === 0 ? 0 : (run / total) * 190;
                if (i > 0) run += s.v; else run = s.v;
                const xx = s.v >= 0 ? start : start + (s.v / total) * 190;
                return (
                  <g key={i}>
                    <text x="0" y={i * H + 12} fontSize="9" style={{ fill: "var(--ink2)" }} fontFamily="Inter">{s.l}</text>
                    <rect x={100 + Math.max(0, xx)} y={i * H + 4} width={Math.max(1.5, w)} height="12"
                      style={{ fill: i === 0 ? "var(--ink)" : s.v >= 0 ? "var(--teal)" : "var(--ox)" }} />
                    <text x="298" y={i * H + 14} fontSize="9" textAnchor="end" style={{ fill: "var(--ink)" }} fontFamily="JetBrains Mono">
                      {(s.v >= 0 && i > 0 ? "+" : "") + Math.round(s.v)}
                    </text>
                  </g>
                );
              })}
              <line x1="100" y1={N * H} x2="298" y2={N * H} style={{ stroke: "var(--rule)" }} />
              <text x="0" y={N * H + 17} fontSize="9" style={{ fill: "var(--ink)" }} fontFamily="Inter" fontWeight="600">Gesamtrückfluss</text>
              <rect x="100" y={N * H + 6} width={Math.max(2, (totalOut / total) * 190)} height="14" style={{ fill: "var(--gold)" }} />
              <text x="298" y={N * H + 17} fontSize="9" textAnchor="end" style={{ fill: "var(--ink)" }} fontFamily="JetBrains Mono" fontWeight="700">
                {Math.round(totalOut)}
              </text>
            </svg>
            <p style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.5, marginTop: 10 }}>
              Alle Werte in Mio. € Eigenkapital. Eingesetztes Eigenkapital plus die Effekte ergeben exakt den
              Gesamtrückfluss — Nettoerlös beim Exit zuzüglich aller Rekapitalisierungen, die während der Haltezeit
              schon an den Fonds geflossen sind. „Transaktionskosten &amp; Abschläge" enthält Transaktionskosten beim
              Kauf und Verkauf sowie den kanalspezifischen Abschlag — der Teil, den du nie zurückverdienst.
            </p>
            <button className="solid" style={{ width: "100%", marginTop: 4 }} onClick={close}>Weiter</button>
          </div>
        </div>
      </div>
    </div>
  );
}

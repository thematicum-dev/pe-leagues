"use client";

import React, { useState, useMemo, useEffect, useContext } from "react";
import { Search, Briefcase, Trophy } from "lucide-react";

import { createRng } from "@/lib/engine";
import type { Rng } from "@/lib/engine";
import {
  ACC_SPREAD, ADDON_HEADROOM, AI_PLAN, ARCHES, BASE_RATE, BIL_DISC, BIL_FEE, BOOK, CAPITAL,
  CLS_LABEL, COV_FLOOR, COV_HEADROOM, CV_DISC, CV_FEE, CV_STAKE, DD_COST, END_PRESSURE_FROM,
  ENTRY_FEE, EVENTS, FAIL_SUNK, INITS, INIT_SLOTS, INVEST_PERIOD, IPO_DISC, IPO_EBITDA, IPO_FEE,
  IPO_PLACE, IRR_BENCH, LEV_FREE, LEV_STEP, LIQ_DISC, LM_ANNOUNCE, LM_DEAL, LTIP_SHARE, MAX_PROC,
  MAX_SLOTS, MGMT_FEE, MIN_HOLD, PARTIAL_DELIVERY, PERIODS, POACH, PROC_FEE, PROC_Q, QUAL_COEF,
  RECYCLE_CAP, REPEAT_MAX, RESERVE_PROC, RESERVE_PROP, ROLE3, SECCOLOR, SECLABEL, SECNAMES,
  SECTORS, SIZE_SCALE, TVPI_BENCH, accEff, addonCheck, addonRisk, anyInit, applyProceeds,
  buildInit, cagrOf, cagrPrem, cappedSkill, ceilingFactor, clamp, ddCapOf, ddCostOf, dealMoic,
  dealMultiple, dpiOf, driftBandOf, driftEstOf, ebitdaOf, effSkill, endPressure, eqvOf, eur,
  evOf, fairOf, feeReserveOf, fitLabel, fitOf, gebote, grossMoicOf, growthPrem, healthOf, hj,
  initById, initDur, initGain, initRuns, initSuccess, initsOf, investableOf, irrOf, isAngle,
  isCapped, makeBridge, makeOffers, makeSeats, markMultiple, maturePeople, navValueOf, newDeal,
  newLandmark, opLeverage, overstretch, payOf, pct, pctS, peopleLvl, recycleRoom, repeatMalus,
  retainerOf, scoreOf, seatLoad, severanceOf, signBonusOf, spendFund, stepCompany, tvpiOf, x,
} from "@/lib/engine";

export const TAB_ICON = { deals: Search, port: Briefcase, rank: Trophy };
export const TAB_IDX = { deals: 0, port: 1, rank: 2 };

export const CSS = `
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
export function haptic(pattern = 8) {
  try { if (navigator?.vibrate) navigator.vibrate(pattern); } catch (_) {}
}

// Zahlen springen nicht stumm um, sondern zählen sich sichtbar hoch/runter
export function AnimatedNumber({ value, format, className, style }) {
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
export function Confetti({ seed, rng }: { seed: number; rng: Rng }) {
  const colors = ["#A9863C", "#1F5F5B", "#7A2E2E", "#8478BE", "#E9EDE4"];
  const pieces = useMemo(() => Array.from({ length: 26 }, (_, i) => ({
    id: i, l: 2 + rng.rnd() * 96, delay: rng.rnd() * .35, dur: 1.1 + rng.rnd() * .6,
    c: colors[i % colors.length], rot: Math.round(rng.rnd() * 360),
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
export function Toasts({ items }) {
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


/* ---------------- Teilkomponenten ---------------- */

export function News({ feed, quarter, practice }) {
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
export const CoachCtx = React.createContext(null);

export function Coach({ eyebrow, title, children, step, total }) {
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
export const Kpi = ({ t, children }) => <><dt>{t}</dt><dd>{children}</dd></>;

export function DealCard({ d, me, bid, dd, onDD, setBid, clear, market, ddUsed, ddCap, quarter }) {
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

export function Holding({ c, market, neg, quarter, procCount, freeSlots, act, practice }) {
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
              <button style={{ flex: 1 }} disabled title="Vorübergehend deaktiviert">🔄 GP-led Secondary</button>
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

export function Pips({ v, cls }) {
  return (
    <span className="pips">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = v - i;
        return <i key={i} className={"pip " + cls + (fill >= 1 ? " on" : fill > 0 ? " on half" : "")} />;
      })}
    </span>
  );
}

export function Stages({ c, compact }) {
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

export function Track({ c }) {
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
export function TvpiChart({ hist, meIdx }) {
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
export function SectorSplit({ holdings, market, cash }) {
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
export function Shelf({ holdings, market, cash, quarter, onPick }) {
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
export function Def({ t, children }) {
  return (
    <div className="def">
      <div className="dt">{t}</div>
      <div className="dd">{children}</div>
    </div>
  );
}

export function MarketChart({ hist }) {
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
export function UseProceeds({ item, me, quarter, settle }) {
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

export function InitPicker({ c, dim, market, start, close }) {
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

export function Shortlist({ item, holding, analysis, hire, reject }) {
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

export function Offers({ item, holding, market, neg, decide }) {
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

export function Sheet({ sheet, close, onConfirm }) {
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

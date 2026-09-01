"use client";

import React, { useState, useMemo, useEffect, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, Briefcase, Trophy } from "lucide-react";

import { createRng } from "@/lib/engine";
import type { Rng } from "@/lib/engine";
import {
  ACC_SPREAD, ADDON_HEADROOM, AI_PLAN, ARCHES, BASE_RATE, BIL_DISC, BIL_FEE, BOOK, CAPITAL,
  CLS_LABEL, COV_DEFAULT, COV_FLOOR, COV_HEADROOM, CV_DISC, CV_FEE, CV_STAKE, DD_COST, END_PRESSURE_FROM,
  ENTRY_FEE, EVENTS, FAIL_SUNK, INITS, INIT_SLOTS, INVEST_PERIOD, IPO_DISC, IPO_EBITDA, IPO_FEE,
  IPO_PLACE, IRR_BENCH, LEV_FREE, LEV_STEP, LIQ_DISC, LM_ANNOUNCE, LM_DEAL, LTIP_SHARE, MAX_PROC,
  MAX_SLOTS, MGMT_FEE, MIN_HOLD, PARTIAL_DELIVERY, PERIODS, POACH, PROC_FEE, PROC_Q, QUAL_COEF,
  RECYCLE_CAP, REPEAT_MAX, RESERVE_PROC, RESERVE_PROP, ROLE3, SECCOLOR, SECLABEL, SECNAMES,
  SECTORS, SIZE_SCALE, TVPI_BENCH, accEff, addonCheck, addonRisk, anyInit, applyProceeds,
  buildInit, cagrOf, cagrPrem, cappedSkill, ceilingFactor, clamp, ddCapOf, ddCostOf, dealMoic,
  dealMultiple, dpiOf, driftBandOf, driftEstOf, ebitdaOf, effSkill, endPressure, eqvOf, eur,
  evOf, fairOf, feeReserveOf, fitLabel, fitOf, gebote, grossMoicOf, growthPrem, healthOf, hj,
  impliedMoM, initById, initDur, initGain, initRuns, initSuccess, initsOf, investableOf, irrOf,
  isAngle, LBO_YEARS, dealStatements, holdingStatements, ratiosOf, growthOf, bridgeStep,
  fundBridge,
  PPE_YEARS, TAX_RATE, DEAL_YEARS, MIN_CASH_PCT,
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
/* Erklär-Punkt neben spielspezifischen Kennzahlen. Tippen klappt den Text
   darunter auf — kein Hover, weil das auf dem Telefon nicht existiert. */
.pel .infb{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;
  border-radius:50%;border:1px solid var(--rule);background:transparent;color:var(--ink2);
  font-size:9.5px;font-weight:700;font-family:inherit;line-height:1;padding:0;margin-left:5px;
  vertical-align:middle;cursor:pointer;flex:none;}
.pel .infb:hover:not(:disabled){background:var(--ink2);color:var(--card);border-color:var(--ink2);}
.pel .infb.on{background:var(--gold);border-color:var(--gold);color:var(--panel);}
/* Die Erklärung erscheint als Bottom Sheet, nicht als Block unter dem Button.
   Grund: die Buttons sitzen teils in sehr schmalen Spalten (KPI-Raster,
   Tabellenzellen) — dort wurde der Text auf wenige Zeichen Breite gequetscht
   und war praktisch unlesbar. Das Sheet ist von der Position des Buttons
   unabhängig und auf dem Telefon ohnehin die vertrautere Geste. */
.pel .infsheet{padding:20px 18px 26px;}
.pel .infsheet .it{font-size:15px;font-weight:600;letter-spacing:-.015em;margin:0 0 10px;}
.pel .infsheet .ib{font-size:13.5px;line-height:1.65;color:var(--ink2);}
.pel .infsheet .ib b{color:var(--ink);font-weight:600;}
.pel .infsheet .ic{width:100%;margin-top:18px;}
.pel .infgrip{width:34px;height:4px;border-radius:2px;background:var(--rule);margin:10px auto 4px;}
/* Treiberbalken: positiv nach rechts, negativ nach links, gemeinsame Skala. */
.pel .drv{display:flex;flex-direction:column;gap:7px;}
.pel .drvrow{display:flex;align-items:center;gap:8px;}
.pel .drvlab{font-size:11.5px;color:var(--ink2);width:88px;flex:none;}
.pel .drvtrack{position:relative;flex:1;height:12px;min-width:0;background:var(--shade);}
.pel .drvzero{position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--rule);}
.pel .drvbar{position:absolute;top:1px;bottom:1px;min-width:1px;}
.pel .drvbar.pos{background:var(--teal);}
.pel .drvbar.neg{background:var(--ox);}
.pel .drvval{font-size:11.5px;width:78px;flex:none;text-align:right;}
.pel .drvhint{font-size:10.5px;color:var(--ink2);}
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
/* Lange Bezeichnungen (".. vs. Sektor Benchmark") dürfen umbrechen, statt die
   Wertspalte aus der Karte zu drücken. */
.pel .ledger td.lab.wrap{white-space:normal;width:auto;min-width:0;}
/* Gruppentrenner innerhalb einer Kennzahlentabelle: Geschäft / Ertrag /
   Bewertung stehen als Blöcke, ohne dass es Zwischenüberschriften braucht. */
.pel .ledger tr.sep td{border-top:1px solid var(--rule);padding-top:15px;}
.pel .ledger tr.sep + tr td{padding-top:11px;}
.pel .lb .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

/* Gegenüberstellung zweier Zeiträume: letztes Halbjahr gegen die ganze
   Halteperiode. Drei Spalten, damit sich beide Zahlen direkt vergleichen
   lassen statt in zwei getrennten Blöcken zu stehen. */
.pel table.cmp{width:100%;border-collapse:collapse;}
.pel table.cmp th,.pel table.cmp td{font-size:12.5px;padding:8px 16px;text-align:right;
  border-bottom:1px solid var(--rule);white-space:nowrap;
  font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums;}
.pel table.cmp th{font-family:'Inter',system-ui,sans-serif;font-size:9.5px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--ink2);font-weight:600;padding-top:0;padding-bottom:6px;}
.pel table.cmp th:first-child,.pel table.cmp td:first-child{text-align:left;color:var(--ink2);
  font-family:'Inter',system-ui,sans-serif;white-space:normal;}
.pel table.cmp tr:last-child td{border-bottom:0;}
/* Abschnittszeile und Summenzeile wie in der Berichtsansicht (table.fin):
   Die Überschrift steht ohne Unterstrich über ihrem Abschnitt, die Summe wird
   durch eine Linie darüber abgesetzt. Beide Tabellen zeigen Zahlen zur selben
   Beteiligung und sollen sich deshalb gleich lesen. */
.pel table.cmp tr.seg td{font-family:'Inter',system-ui,sans-serif;font-size:9.5px;
  letter-spacing:.12em;text-transform:uppercase;color:var(--ink2);font-weight:600;
  padding-top:17px;padding-bottom:5px;border-bottom:0;}
.pel table.cmp tr.sum td,.pel table.cmp tr.sum td:first-child{font-weight:600;color:var(--ink);
  border-top:1px solid var(--rule);}

/* ---------- Berichtsansicht: GuV, Bilanz, Kapitalflussrechnung ----------
   Ein Abschluss ist breiter als ein Telefon. Statt die Spalten zu stauchen,
   scrollt die Tabelle waagerecht und die Bezeichnungsspalte bleibt stehen —
   dieselbe Geste wie in jedem Tabellenblatt, aus dem diese Zahlen kämen. */
.pel .finwrap{overflow-x:auto;-webkit-overflow-scrolling:touch;border-top:1px solid var(--rule);}
.pel table.fin{border-collapse:collapse;width:100%;}
.pel table.fin th,.pel table.fin td{font-size:12px;line-height:1.35;padding:7px 12px;white-space:nowrap;
  border-bottom:1px solid var(--rule);text-align:right;
  font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums;}
.pel table.fin th{font-family:'Inter',system-ui,sans-serif;font-weight:600;font-size:11.5px;
  color:var(--ink);vertical-align:bottom;padding-top:12px;}
.pel table.fin th small{display:block;font-weight:500;font-size:9px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--ink2);margin-top:3px;}
.pel table.fin th.rl,.pel table.fin td.rl{text-align:left;position:sticky;left:0;z-index:1;
  background:var(--card);font-family:'Inter',system-ui,sans-serif;color:var(--ink2);
  min-width:158px;max-width:158px;padding-right:8px;white-space:normal;
  box-shadow:1px 0 0 var(--rule);}
.pel table.fin tr.sum td{font-weight:600;color:var(--ink);border-top:1px solid var(--rule);}
.pel table.fin tr.sum td.rl{color:var(--ink);}
.pel table.fin tr.memo td{font-size:10.5px;color:var(--ink2);padding-top:0;padding-bottom:8px;border-bottom:0;}
.pel table.fin tr.memo + tr td{border-top:1px solid var(--rule);}
.pel table.fin tr.head td{padding-top:16px;border-bottom:0;}
.pel table.fin tr.head td.rl{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--ink2);font-weight:600;}
.pel table.fin col.est,.pel table.fin td.est{color:var(--ink2);}
/* Umschalter zwischen den drei Rechenwerken */
.pel .finseg{display:flex;gap:6px;padding:12px 16px 2px;}
.pel .finseg button{flex:1;padding:9px 4px;font-size:11.5px;font-weight:600;}
.pel .finseg button.on{background:var(--ink);color:var(--paper);border-color:var(--ink);}
.pel .finnote{font-size:11px;line-height:1.6;color:var(--ink2);margin:0;padding:12px 16px 0;}
.pel .finnote + .finnote{padding-top:7px;}
.pel .finnote b{color:var(--ink);font-weight:600;}

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
  /* Implied MoM: der Base Case des Underwritings zum aktuellen Reglerstand.
     Ohne Datenraum gibt es keine Schätzung des Wachstums gegenüber dem Sektor
     — dann wird mit Sektorwachstum gerechnet. Ist das EBITDA selbst verdeckt
     (proprietärer Deal, zu geringe Analysefähigkeit), bleibt auch der MoM
     verdeckt: sonst ließe sich aus ihm zurückrechnen, was die Karte gerade
     bewusst nicht zeigt. */
  const mom = hidden ? null : impliedMoM(d, mult, lev, me.attrs.financing, { drift: dd ? dEst : 0 });
  /* Der Abschluss zum Zielunternehmen: drei Geschäftsjahre, zurückgerechnet
     über das ausgewiesene Wachstum, cash-free/debt-free. Ohne Datenraum bleibt
     alles unter der Umsatzzeile verdeckt — der Bericht darf nicht mehr zeigen
     als die Karte darüber.                                                   */
  const statements = useMemo(() => dealStatements(d), [d]);

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
      {/* Reihenfolge folgt dem Lesefluss einer Investmentvorlage: erst das
          Geschäft (Umsatz und Wachstum), dann der Ertrag und seine Qualität,
          dann die Bewertung. Die Rechnung — Enterprise Value, Equity Ticket
          und Implied MoM — steht unter den Reglern, weil sie sich mit Gebot
          und Leverage bewegt. */}
      <table className="ledger"><tbody>
        <tr><td className="lab">Umsatz LTM</td><td>{eur(d.revenue)}</td></tr>
        <tr><td className="lab">Umsatzwachstum L3Y</td><td>{pct(d.growth)}
          {bench
            ? <span style={{ color: gapG >= 0 ? "var(--teal)" : "var(--ox)", fontSize: 11 }}>
                {" "}{gapG >= 0 ? "+" : "−"}{Math.abs(gapG).toFixed(1).replace(".", ",")} pp</span>
            : <span style={{ color: "var(--ink2)", fontSize: 11 }}>{" "}?</span>}</td></tr>
        <tr><td className="lab wrap">Erwartetes Wachstum vs. Sektor Benchmark</td><td>
          {dd
            ? <span style={{ color: dEst >= 0 ? "var(--teal)" : "var(--ox)" }}>
                {dEst >= 0 ? "+" : "−"}{Math.abs(dEst).toFixed(1).replace(".", ",")}
                <span style={{ color: "var(--ink2)", fontSize: 11 }}>
                  {" "}± {dBand.toFixed(1).replace(".", ",")} pp p.a.
                </span>
              </span>
            : <span style={{ color: "var(--ink2)" }}>— <span style={{ fontSize: 11 }}>nur mit Datenraum</span></span>}
          <Info k="drift" />
        </td></tr>

        <tr className="sep"><td className="lab">Adj. EBITDA LTM</td><td>{hidden ? "—" : eur(eb)}<Info k="adjEbitda" /></td></tr>
        <tr><td className="lab wrap">Adj. EBITDA-Marge vs. Sektor Benchmark</td><td>{hidden ? "—" : pct(d.margin)}
          {!hidden && (bench
            ? <span style={{ color: gapM >= 0 ? "var(--teal)" : "var(--ox)", fontSize: 11 }}>
                {" "}{gapM >= 0 ? "+" : "−"}{Math.abs(gapM).toFixed(1).replace(".", ",")} pp</span>
            : <span style={{ color: "var(--ink2)", fontSize: 11 }}>{" "}?</span>)}</td></tr>
        <tr><td className="lab">Adj. EBITDA − Capex</td><td>{hidden ? "—" : eur(eb - capexA)}</td></tr>
        <tr><td className="lab">Cash Conversion</td>
          <td style={{ color: hidden ? "var(--ink2)" : conv >= 60 ? "var(--teal)" : conv >= 35 ? "var(--ink)" : "var(--ox)" }}>
            {hidden ? "—" : pct(conv)}<Info k="conv" /></td></tr>
        <tr><td className="lab">Assetqualität</td><td>{hidden ? "—" : Math.round(d.quality)}<Info k="quality" /></td></tr>

        <tr className="sep"><td className="lab">EV/EBITDA Sektor</td><td>{x(market[d.sector])}</td></tr>
        <tr><td className="lab">Bewertungserwartung</td><td>{x(d.askMult)}</td></tr>
      </tbody></table>
      <div className="pad" style={{ paddingTop: 12 }}>
        <StatementsButton statements={statements} hidden={hidden}
          label={`📑 Financial Statements · ${DEAL_YEARS} Jahre`} />
        <p className="hint" style={{ margin: "6px 0 12px" }}>
          {hidden ? "Ohne Datenraum nur die Umsatzreihe — Ertrag und Cashflow bleiben verdeckt."
            : "GuV, Bilanz und Kapitalflussrechnung des Ziels, aggregiert wie im Investmentmodell."}
        </p>
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
                : flagHidden ? "Flagge ungeprüft, Branchenreferenz und erwartetes Wachstum ggü. dem Sektor fehlen."
                : ddFull ? `Bei Analysefähigkeit ${me.attrs.analysis} laufen höchstens ${ddCap} Datenräume gleichzeitig. Ein Prozess müsste abgebrochen werden.`
                : `Branchenreferenz, Schätzung des Wachstums gegenüber dem Sektor (± ${dBand.toFixed(1).replace(".", ",")} pp) und kein Post-Closing-Risiko. Fällig sofort — auch wenn du den Deal nicht bekommst.`}
            </p>
          </div>
        )}
        <div className="slrow"><span>Gebot</span>
          <span className="slval" style={{ color: mult < reserve ? "var(--ox)" : "var(--ink)" }}>{x(mult)} EBITDA</span></div>
        <input type="range" min={q4(Math.max(3, reserve - 0.5))} max={q4(d.askMult + 4)} step={0.25} value={mult} onChange={(e) => setMult(+e.target.value)} />
        <p className={"hint" + (mult < reserve ? " ox" : "")} style={{ margin: "2px 0 0" }}>
          {mult < reserve
            ? `Unter der Schmerzgrenze des Verkäufers (rund ${x(reserve)}) — er zieht das Objekt zurück.`
            : d.type === "prop"
              ? `Off-Market. Der Gesellschafter verkauft nicht unter rund ${x(reserve)}, andere Fonds sitzen selten mit am Tisch.`
              : `Auktion. Reservationspreis rund ${x(reserve)}, die Kohorte bietet mit.`}
        </p>
        <div className="slrow" style={{ marginTop: 8 }}><span>Leverage</span>
          <span className="slval">{x(lev)} · {pct(rateA)} · Cov {x(Math.max(COV_FLOOR, lev + COV_HEADROOM + 0.10 * me.attrs.financing))}</span></div>
        <input type="range" min={0} max={q4(cap)} step={0.25} value={lev} onChange={(e) => setLev(+e.target.value)} />
        <table className="ledger" style={{ marginTop: 10 }}><tbody>
          <tr><td className="lab">Enterprise Value</td><td>{hidden ? "≈ " + eur(eb * mult) : eur(eb * mult)}</td></tr>
          <tr><td className="lab">Equity Ticket</td><td style={{ color: afford ? "var(--ink)" : "var(--ox)" }}>{eur(eq)}</td></tr>
          {/* Bewegt sich mit beiden Reglern: ein höheres Gebot drückt den
              Multiple, mehr Fremdkapital hebelt ihn — bis der Zins ihn
              wieder auffrisst. */}
          <tr><td className="lab">Implied MoM {LBO_YEARS}Y</td>
            <td style={{ color: mom == null ? "var(--ink2)" : mom >= 2 ? "var(--teal)" : mom >= 1.5 ? "var(--ink)" : "var(--ox)", fontWeight: 600 }}>
              {mom == null ? "—" : `${mom.toFixed(2)}×`}
              <Info k="impliedMoM" />
            </td></tr>
        </tbody></table>
        {mom != null && (
          <p className="hint" style={{ marginTop: 6 }}>
            Base Case ohne Value Creation, Exit zum Einstiegsmultiple nach {LBO_YEARS} Jahren.
            Was darüber hinausgeht, musst du selbst erarbeiten.
          </p>
        )}
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
  /* Volle Historie seit dem Vollzug, inklusive Transaktionseffekte: die
     Eröffnungsbilanz steht zum Kaufpreis, die Akquisitionsfinanzierung
     darunter. Die Reihe wächst mit jedem Halbjahr, deshalb hängt das Memo an
     der hist-Länge und am heutigen Stand der Nettoverschuldung.             */
  const statements = useMemo(() => holdingStatements(c), [c]);
  // Spalten abzüglich der Eröffnungsspalte: so viele Geschäftsjahre stehen im Bericht
  const finYears = statements ? statements.periods.length - 1 : 0;
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
            <div className="eyebrow">Adj. EBITDA<Info k="adjEbitda" /></div>
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
            <div className="eyebrow">Adj. EBITDA − Capex</div>
            <div className="mono kv">{cf ? eur(cf.eb - cf.capex) : "—"}</div>
          </div>
          <div>
            <div className="eyebrow">Cash Conversion<Info k="conv" /></div>
            <div className="mono kv" style={{ color: conv == null ? "var(--ink)" : conv >= 60 ? "var(--teal)" : conv >= 35 ? "var(--ink)" : "var(--ox)" }}>
              {conv == null ? "—" : pct(conv)}
            </div>
          </div>
          <div>
            <div className="eyebrow">Leverage<Info k="cov" /></div>
            <div className="mono kv" style={{ color: lev > (c.covLimit ?? COV_DEFAULT) ? "var(--ox)" : "var(--ink)" }}>
              {x(lev)}
              <span style={{ display: "block", fontSize: 10, color: "var(--ink2)", fontWeight: 400, marginTop: 2 }}>
                Cov {x(c.covLimit ?? COV_DEFAULT)} · {pct(cf ? cf.rate : c.rate)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <table className="ledger"><tbody>
        <tr><td className="lab">Assetqualität</td><td>{Math.round(c.quality)}
          {c.entryQuality != null && <span style={{ color: c.quality >= c.entryQuality ? "var(--teal)" : "var(--ox)", fontSize: 11 }}>
            {" "}{c.quality >= c.entryQuality ? "+" : "−"}{Math.abs(Math.round(c.quality - c.entryQuality))}</span>}
          <Info k="quality" /></td></tr>
        <tr><td className="lab">Enterprise Value</td>
          <td>{eur(evOf(c, markMultiple(c, market)))} <span style={{ fontSize: 11, color: "var(--ink2)" }}>bei {x(markMultiple(c, market))}</span></td></tr>
        <tr><td className="lab">Total Value</td>
          <td style={{ color: mTot >= 1 ? "var(--teal)" : "var(--ox)", fontWeight: 600 }}>
            {eur(val + out)} <span style={{ fontSize: 11, fontWeight: 400 }}>· {mTot.toFixed(2)}×</span>
            {out > 0.5 && <span style={{ fontSize: 11, color: "var(--ink2)", fontWeight: 400 }}> inkl. {eur(out)}</span>}</td></tr>
      </tbody></table>
      <Stages c={c} compact={quarter} />
      <PerformanceCompare c={c} />
      <Track c={c} />
      <div className="pad" style={{ paddingTop: 4, paddingBottom: 0 }}>
        <StatementsButton statements={statements}
          label={`📑 Financial Statements${finYears
            ? ` · ${finYears} ${finYears === 1 ? "Jahr" : "Jahre"} Halteperiode`
            : " · Eröffnungsbilanz"}`} />
        <p className="hint" style={{ marginTop: 6 }}>
          GuV, Bilanz und Kapitalflussrechnung seit dem Vollzug — mit Kaufpreisallokation,
          Akquisitionsfinanzierung und der Überleitung von bereinigtem auf berichtetes EBITDA.
        </p>
      </div>
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

/* Wie hat sich die Beteiligung entwickelt — im letzten Halbjahr und über die
   ganze Halteperiode? Eine Tabelle, zwei Spalten, zwei Abschnitte:

   - oben die Finanzkennzahlen als Veränderung (Prozent, Prozentpunkte, Turns);
   - unten dieselbe Entwicklung in Euro, aufgeteilt nach Ursache, mit dem
     Gesamtwert als Summenzeile.

   Vorher stand das nebeneinander: erst die Treiber des letzten Halbjahres als
   Balken, darunter eine Tabelle mit den Kennzahlen beider Zeiträume. Die
   beiden Blöcke überschnitten sich — die Wertveränderung stand zweimal da, in
   der Balkenüberschrift ohne und in der Zeile "Gesamtwert" mit den bereits
   entnommenen Beträgen — und ließen zugleich eine Lücke: Die Treiber gab es
   nur für das letzte Halbjahr, nicht seit Einstieg. Jetzt ist beides eine
   Aufteilung derselben Größe über dieselben zwei Zeiträume, und die Zeilen des
   unteren Abschnitts addieren sich exakt auf den Gesamtwert.

   Alle Zahlen kommen aus der hist-Reihe, also aus denselben Periodenständen,
   die auch der Verlaufsgraph und die Berichtsansicht benutzen.             */
function deltaSet(a, b) {
  return {
    rev: a.rev > 0 ? (b.rev / a.rev - 1) * 100 : null,
    eb: a.eb > 0 ? (b.eb / a.eb - 1) * 100 : null,
    mg: b.mg - a.mg,
    lev: b.nd / Math.max(0.5, b.eb) - a.nd / Math.max(0.5, a.eb),
  };
}

export function PerformanceCompare({ c }) {
  const h = c.hist || [];
  if (h.length < 2) {
    return (
      <div className="pad" style={{ paddingTop: 4, paddingBottom: 14, fontSize: 12, color: "var(--ink2)" }}>
        Der Vergleich erscheint nach dem ersten vollen Halbjahr im Portfolio.
      </div>
    );
  }
  const now = h[h.length - 1];
  const kpi = [deltaSet(h[h.length - 2], now), deltaSet(h[0], now)];
  const val = [bridgeStep(h[h.length - 2], now), bridgeStep(h[0], now)];

  const num = (v, dg, unit) => v == null ? "—"
    : (v >= 0 ? "+" : "−") + Math.abs(v).toLocaleString("de-DE", { minimumFractionDigits: dg, maximumFractionDigits: dg }) + unit;
  const money = (v) => v == null ? "—" : (v >= 0 ? "+" : "−") + eur(Math.abs(v));
  /* Beim Leverage ist weniger besser, bei allem anderen mehr. */
  const up = (v) => v >= 0, down = (v) => v <= 0;
  const kpiRows = [
    { l: "Umsatz", k: "rev", dg: 1, unit: " %", good: up },
    { l: "Adj. EBITDA", k: "eb", dg: 1, unit: " %", good: up },
    { l: "Adj. EBITDA-Marge", k: "mg", dg: 1, unit: " pp", good: up },
    { l: "Leverage", k: "lev", dg: 2, unit: "×", good: down },
  ];
  // Ausschüttung und Sonstiges nur, wenn sie in einer der Spalten etwas erklären
  const has = (k) => val.some((v) => v && Math.abs(v[k]) > 0.05);
  const valRows = [
    { l: "EBITDA", k: "ebitda" },
    { l: "Multiple", k: "mult" },
    { l: "Entschuldung", k: "delev" },
    ...(has("dist") ? [{ l: "Ausschüttung", k: "dist" }] : []),
    ...(has("rest") ? [{ l: "Sonstiges", k: "rest" }] : []),
  ];
  const tone = (v, good) => ({ color: v == null ? "var(--ink2)" : good(v) ? "var(--teal)" : "var(--ox)" });

  return (
    <>
      <div className="pad" style={{ paddingTop: 12, paddingBottom: 4 }}>
        <div className="eyebrow">
          Performance
          <Info t="Letztes Halbjahr gegen Halteperiode">
            Links die Veränderung der letzten Periode, rechts die seit dem Vollzug. Der Vergleich
            beantwortet die Frage des Portfolio-Reviews: Läuft die Beteiligung <b>gerade</b> besser
            oder schlechter als im Schnitt der bisherigen Haltezeit? Ein starker Gesamtwert seit
            Einstieg bei schwachem letztem Halbjahr heißt, dass die Wertsteigerung hinter dir liegt
            — ein guter Zeitpunkt, über den Exit nachzudenken.
            <br /><br />
            Der <b>Wertbeitrag</b> zerlegt dieselbe Entwicklung in Euro nach Ursache.
            <b> EBITDA</b> ist operative Arbeit — mehr Umsatz oder bessere Marge, bewertet zum alten
            Multiple. <b>Multiple</b> ist der Markt: dieselbe Substanz wird höher oder niedriger
            bewertet, dafür kannst du wenig. <b>Entschuldung</b> ist getilgte Nettoverschuldung, die
            eins zu eins ins Eigenkapital wandert. Die Zeilen addieren sich auf den Gesamtwert.
          </Info>
        </div>
      </div>
      <table className="cmp"><tbody>
        <tr>
          <th>Kennzahl</th>
          <th>Letztes HJ</th>
          <th>Seit Einstieg</th>
        </tr>
        {kpiRows.map((r) => (
          <tr key={r.k}>
            <td>{r.l}</td>
            {kpi.map((set, i) => <td key={i} style={tone(set[r.k], r.good)}>{num(set[r.k], r.dg, r.unit)}</td>)}
          </tr>
        ))}
        <tr className="seg"><td colSpan={3}>Wertbeitrag</td></tr>
        {valRows.map((r) => (
          <tr key={r.k}>
            <td>{r.l}</td>
            {val.map((set, i) => <td key={i} style={tone(set && set[r.k], up)}>{money(set && set[r.k])}</td>)}
          </tr>
        ))}
        <tr className="sum">
          <td>Gesamtwert</td>
          {val.map((set, i) => <td key={i} style={tone(set && set.total, up)}>{money(set && set.total)}</td>)}
        </tr>
      </tbody></table>
    </>
  );
}

/* ---------- Financial Statements ----------
   GuV, Bilanz und Kapitalflussrechnung zu einem Zielunternehmen oder einer
   Beteiligung. Die Zahlen kommen vollständig aus lib/engine/financials.ts und
   damit aus der Mitschrift der Engine — diese Datei formatiert nur.

   Drei Rechenwerke, ein Umschalter, waagerecht scrollende Spalten. Bewusst
   aggregiert: der Detailgrad eines Investorenmodells, nicht der eines
   Jahresabschlusses. Wer wissen will, was eine Zeile bedeutet, findet die
   Herleitung in den Fußnoten unter der Tabelle.                             */

/* Beträge in Mio. €, ohne Einheit — die steht in der Kopfzeile. Ein Strich
   statt einer Null: eine Zeile, in der nichts passiert ist, soll nicht so
   aussehen, als wäre dort gerechnet worden.                                 */
export function fnum(v, dg = 1) {
  if (v == null || !Number.isFinite(v)) return "—";
  const f = Math.pow(10, dg);
  const r = Math.round(v * f) / f;
  if (Math.abs(r) < 0.5 / f) return "–";
  const t = Math.abs(r).toLocaleString("de-DE", { minimumFractionDigits: dg, maximumFractionDigits: dg });
  return (r < 0 ? "−" : "") + t;
}
const fpct = (v, dg = 1) => (v == null || !Number.isFinite(v) ? "—"
  : (v < 0 ? "−" : "") + Math.abs(v).toLocaleString("de-DE", { minimumFractionDigits: dg, maximumFractionDigits: dg }) + " %");
const fx = (v) => (v == null || !Number.isFinite(v) ? "—"
  : v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "×");

/* Zeilendefinitionen je Rechenwerk. `v` liefert den Betrag in
   Darstellungsrichtung: Aufwand negativ, damit sich jede Zwischensumme durch
   Addition der Zeilen darüber ergibt und niemand raten muss, welches
   Vorzeichen gemeint ist.                                                   */
/* eslint-disable @typescript-eslint/no-explicit-any */
interface FinRow {
  k: string; l: string;
  head?: boolean;   // Abschnittsüberschrift über die ganze Breite
  memo?: boolean;   // Nachrichtlich: Quote oder Kennzahl, keine Rechengröße
  sum?: boolean;    // Zwischensumme
  v?: (p: any, i: number, P: any[]) => number | null;
  s?: (p: any, i: number, P: any[]) => string;
}

function plRows(st): FinRow[] {
  const rows: FinRow[] = [
    { k: "rev", l: "Umsatz", v: (p) => p.revenue },
    { k: "growth", memo: true, l: "Wachstum ggü. Vorperiode",
      /* Für die erste Spalte eines Zielunternehmens ist die Vorperiode das
         Basisjahr der Dreijahres-CAGR — sichtbar ist sie nicht, aber ihr
         Umsatz ist bekannt, und ohne sie bliebe ausgerechnet die Zeile leer,
         die die Schwankung zeigen soll. */
      s: (p, i, P) => {
        if (i === 0 && st.kind === "deal" && st.cagrBase > 0) {
          return fpct((p.revenue / st.cagrBase - 1) * 100);
        }
        const g = growthOf(p, P[i - 1] || null, "revenue");
        return g == null ? "—" : fpct(g);
      } },
    { k: "adj", l: "Adjusted EBITDA", v: (p) => p.adjEbitda, sum: true },
    { k: "adjm", memo: true, l: "Adj. EBITDA-Marge", s: (p) => fpct(p.revenue > 0 ? (p.adjEbitda / p.revenue) * 100 : null) },
    { k: "off", l: "Einmalaufwendungen", v: (p) => -p.oneOff },
    { k: "rep", l: "Reported EBITDA", v: (p) => p.repEbitda, sum: true },
    { k: "repm", memo: true, l: "Rep. EBITDA-Marge", s: (p) => fpct(p.revenue > 0 ? (p.repEbitda / p.revenue) * 100 : null) },
    { k: "da", l: "Abschreibungen", v: (p) => -p.da },
    { k: "ebit", l: "EBIT", v: (p) => p.ebit, sum: true },
  ];
  if (st.levered) rows.push({ k: "int", l: "Zinsergebnis", v: (p) => (p.opening ? null : -p.interest) });
  rows.push(
    { k: "ebt", l: "Ergebnis vor Steuern", v: (p) => p.ebt, sum: true },
    { k: "tax", l: "Ertragsteuern", v: (p) => -p.tax },
    { k: "ni", l: "Jahresergebnis", v: (p) => p.netIncome, sum: true },
  );
  return rows;
}

function bsRows(st): FinRow[] {
  const rows: FinRow[] = [
    { k: "h1", head: true, l: "Aktiva" },
    { k: "ppe", l: "Sachanlagen & immaterielle VG", v: (p) => p.ppe },
  ];
  if (st.kind === "holding") rows.push({ k: "gw", l: "Kaufpreisallokation & Goodwill", v: (p) => p.goodwill });
  rows.push({ k: "nwc", l: "Net Working Capital", v: (p) => p.nwc });
  if (st.levered) rows.push({ k: "cash", l: "Liquide Mittel", v: (p) => p.cash });
  rows.push(
    { k: "ta", l: "Bilanzsumme", v: (p) => p.assets, sum: true },
    { k: "nwcp", memo: true, l: "NWC in % vom Jahresumsatz",
      s: (p) => fpct(ratiosOf(p, st.levered).nwcPct) },
    { k: "h2", head: true, l: "Passiva" },
  );
  if (st.levered) {
    rows.push(
      { k: "debt", l: "Bankdarlehen", v: (p) => p.debt },
      { k: "eq", l: "Eigenkapital", v: (p) => p.equity },
      { k: "tp", l: "Bilanzsumme", v: (p) => p.debt + p.equity, sum: true },
      { k: "nd", memo: true, l: "Nettoverschuldung (Darlehen − Liquidität)",
        s: (p) => fnum(p.netDebt) },
      { k: "lev", memo: true, l: "Leverage (Nettoverschuldung / Adj. EBITDA)",
        s: (p) => fx(ratiosOf(p, st.levered).leverage) },
    );
  } else {
    rows.push(
      { k: "nd", l: "Nettoverschuldung (cash-free/debt-free)", v: (p) => p.netDebt },
      { k: "eq", l: "Eigenkapital", v: (p) => p.equity },
      { k: "tp", l: "Bilanzsumme", v: (p) => p.netDebt + p.equity, sum: true },
    );
  }
  return rows;
}

function cfRows(st): FinRow[] {
  const anyAcq = st.periods.some((p) => Math.abs(p.acquisitions) > 0.05);
  const anyDist = st.periods.some((p) => Math.abs(p.distributions) > 0.05);
  const rows: FinRow[] = [
    { k: "adj", l: "Adjusted EBITDA", v: (p) => (p.opening ? null : p.adjEbitda) },
    { k: "off", l: "Einmalaufwendungen", v: (p) => (p.opening ? null : -p.oneOff) },
    { k: "rep", l: "Reported EBITDA", v: (p) => (p.opening ? null : p.repEbitda), sum: true },
    { k: "nwc", l: "Veränderung Net Working Capital", v: (p) => (p.opening ? null : -p.dNwc) },
    { k: "cap", l: "Investitionen (Capex)", v: (p) => (p.opening ? null : -p.capex) },
  ];
  if (anyAcq) rows.push({ k: "acq", l: "Akquisitionen (Add-ons)", v: (p) => (p.opening ? null : -p.acquisitions) });
  /* Erst was das Geschäft erwirtschaftet, dann was Fiskus und Bank davon
     nehmen. Diese Reihenfolge trennt die Leistung des Unternehmens von den
     Folgen seiner Kapitalstruktur — dieselbe Trennung wie zwischen Cash
     Conversion und Leverage auf der Beteiligungskarte.                     */
  rows.push(
    { k: "fcfp", l: "Free Cashflow vor Steuern und Zinsen", v: (p) => (p.opening ? null : p.fcfPreTax), sum: true },
    { k: "tax", l: "Ertragsteuern", v: (p) => (p.opening ? null : -p.tax) },
  );
  if (st.levered) rows.push({ k: "int", l: "Zinsen", v: (p) => (p.opening ? null : -p.interest) });
  rows.push({ k: "ncf", l: "Netto-Cashflow", v: (p) => (p.opening ? null : p.netCashFlow), sum: true });
  if (st.levered) {
    if (anyDist) rows.push({ k: "dist", l: "Ausschüttung an den Fonds", v: (p) => (p.opening ? null : -p.distributions) });
    rows.push(
      { k: "h", head: true, l: "Überleitung Nettoverschuldung" },
      { k: "nd0", l: "Nettoverschuldung Anfang", v: (p) => (p.opening ? null : p.netDebtOpen) },
      { k: "dnd", l: "Veränderung", v: (p) => (p.opening ? null : p.dNetDebt) },
      { k: "nd1", l: "Nettoverschuldung Ende", v: (p) => p.netDebt, sum: true },
    );
  }
  rows.push({ k: "conv", memo: true, l: "Cash Conversion (vor Zins und Steuern)",
    s: (p) => (p.opening ? "—" : fpct(ratiosOf(p, st.levered).conversion)) });
  return rows;
}

const VIEWS = [
  { id: "pl", n: "GuV", rows: plRows },
  { id: "bs", n: "Bilanz", rows: bsRows },
  { id: "cf", n: "Cashflow", rows: cfRows },
];

function StatementsSheet({ st, hidden, close }) {
  const [view, setView] = useState("pl");
  const P = st.periods;
  const rows = (VIEWS.find((v) => v.id === view) || VIEWS[0]).rows(st);
  /* Die Tabelle startet am rechten Rand. Ein Abschluss wird von links nach
     rechts gelesen, aber die Frage ist immer die letzte Spalte — bei einer
     Beteiligung mit acht Jahren Historie hätte man sonst erst vier Wischer zu
     tun, bevor die Gegenwart überhaupt sichtbar wird.                       */
  const wrapRef = useRef(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
    setScrolls(el.scrollWidth > el.clientWidth + 4);
  }, [view]);

  return (
    <div className="modal" role="dialog" aria-modal="true"
      aria-label={`Financial Statements ${st.name}`} onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="tomb">
          <div className="sub">Financial Statements</div>
          <div className="amt" style={{ fontSize: 22 }}>{st.name}</div>
          <div className="sub">
            {SECLABEL[st.sector] || st.sector} · {st.kind === "deal"
              ? `${P.length} Geschäftsjahre, cash-free/debt-free`
              : "Historie seit Vollzug, inklusive Transaktionseffekte"}
          </div>
        </div>
        <div className="card">
          <div className="finseg">
            {VIEWS.map((v) => (
              <button key={v.id} className={view === v.id ? "on" : ""} onClick={() => { haptic(5); setView(v.id); }}>
                {v.n}
              </button>
            ))}
          </div>
          <div className="finwrap" ref={wrapRef}>
            <table className="fin">
              <thead>
                <tr>
                  <th className="rl">Mio. €</th>
                  {P.map((p) => (
                    <th key={p.key}>{p.label}<small>{p.estimated ? "geschätzt" : p.sub}</small></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  if (r.head) {
                    /* Kein colSpan: die Bezeichnungsspalte klebt links, eine
                       über die volle Breite gespannte Zelle täte das nicht und
                       die Überschrift wäre beim Scrollen weg.               */
                    return (
                      <tr className="head" key={r.k}>
                        <td className="rl">{r.l}</td>
                        {P.map((p) => <td key={p.key} />)}
                      </tr>
                    );
                  }
                  /* Ohne Datenraum steht auf der Karte nur der Umsatz. Der
                     Bericht darf nicht mehr verraten als die Karte darüber. */
                  const veiled = hidden && r.k !== "rev" && r.k !== "growth";
                  return (
                    <tr className={(r.sum ? "sum" : "") + (r.memo ? " memo" : "")} key={r.k}>
                      <td className="rl">{r.l}</td>
                      {P.map((p, i) => (
                        <td key={p.key} className={p.estimated ? "est" : ""}>
                          {veiled ? "—" : r.memo ? r.s!(p, i, P) : fnum(r.v!(p, i, P))}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {scrolls && (
            <p className="finnote">Die jüngste Periode steht rechts — waagerecht wischen zeigt die früheren.</p>
          )}
          <StatementNotes st={st} view={view} hidden={hidden} />
          <div className="pad" style={{ paddingTop: 14 }}>
            <button className="solid" style={{ width: "100%" }} onClick={close}>Schließen</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Fußnoten. Sie sind kein Beiwerk: Ohne sie stünde in der GuV eine
   Abschreibung, deren Höhe niemand nachvollziehen kann, und eine Steuer, die
   auf einem anderen Ergebnis bemessen ist als dem darüber. */
function StatementNotes({ st, view, hidden }) {
  if (hidden) {
    return (
      <p className="finnote ox" style={{ color: "var(--ox)" }}>
        Ohne Datenraum liegt nur die Umsatzreihe vor. Alles darunter — Ertrag, Kapitalbindung,
        Cashflow — steht erst mit der Due Diligence zur Verfügung.
      </p>
    );
  }
  const common = (
    <p className="finnote">
      <b>Adjusted gegen Reported EBITDA.</b> Das Modell führt das operative Ergebnis frei von
      Einmaleffekten — das ist das <b>Adjusted EBITDA</b>, und nur dieses steht auf der Karte,
      im Multiple und im Covenant. Programmkosten, Restrukturierung und die Kosten eines
      Managementwechsels sind Einmalaufwendungen: sie werden hier abgezogen und ergeben das
      <b> Reported EBITDA</b>. Investitionsnachholung, Cash Release, Zukäufe und Ausschüttungen
      sind keine Ergebnisgrößen und stehen unterhalb des EBITDA.
    </p>
  );
  return (
    <>
      {common}
      {view === "pl" && (
        <p className="finnote">
          <b>Abschreibungen = Investitionen.</b> Die Steuerbemessungsgrundlage des Modells ist
          EBITDA abzüglich Zins und Capex; Capex steht dort stellvertretend für die Abschreibung.
          Der Steuersatz beträgt {Math.round(TAX_RATE * 100)} %, bemessen auf dem Ergebnis
          <i> vor</i> Einmalaufwendungen — die sind im Modell nicht steuerwirksam.
          {!st.levered && " Zinsen erscheinen nicht: Die Darstellung ist cash-free/debt-free, die Finanzierung des Verkäufers gehört nicht zum Kaufgegenstand."}
        </p>
      )}
      {view === "bs" && (
        <p className="finnote">
          <b>Herleitung.</b> Net Working Capital ist der Bestand, mit dem die Engine rechnet:
          Kapitalbindungsquote mal Umsatz. Die Sachanlagen entsprechen {PPE_YEARS} Jahren
          Investitionsaufwand — bei linearer Abschreibung über rund {PPE_YEARS * 2} Jahre der
          Restbuchwert im Beharrungszustand.{st.levered ? ` Das Modell führt nur die Nettoverschuldung; für die Bilanz wird sie getrennt in eine operative Kasse von ${MIN_CASH_PCT} % vom Jahresumsatz und das Bankdarlehen, das den Rest trägt. Ist die Beteiligung netto schuldenfrei, entfällt das Darlehen und die Kasse trägt den Überschuss.` : ""}
          {st.kind === "holding" && " Die Eröffnungsbilanz steht zum Enterprise Value des Erwerbs; die Kaufpreisallokation trägt den Unterschied zum übernommenen Vermögen, die Akquisitionsfinanzierung steht als Nettoverschuldung darunter. Transaktionskosten des Erwerbs trägt der Fonds, nicht das Unternehmen."}
        </p>
      )}
      {view === "cf" && st.levered && (
        <p className="finnote">
          <b>Überleitung.</b> Nettoverschuldung Anfang abzüglich Netto-Cashflow zuzüglich
          Ausschüttungen ergibt exakt den Stand am Periodenende — dieselbe Zahl, mit der die
          Engine rechnet und die auf der Beteiligungskarte im Leverage steht.
        </p>
      )}
      {st.kind === "deal" && (
        <p className="finnote">
          <b>Historie.</b> Umsatz und Marge zeigen die <b>unterliegende Entwicklung</b> und
          schwanken mit derselben Volatilität, die das Spiel für die Zukunft unterstellt —
          laufendes Wachstums- und Margenrauschen, dazu gedämpft die Sprünge aus dem
          Ereigniskatalog. Was einmalig ist, steht nicht dort, sondern in den
          Einmalaufwendungen: Restrukturierung, ein Managementwechsel, ein abgebrochenes
          Programm drücken das berichtete Ergebnis, nicht das bereinigte. Zwei Größen bleiben
          exakt: das LTM-Jahr und das ausgewiesene Wachstum der letzten drei Jahre. Dessen Basis
          liegt ein Jahr vor der ersten Spalte, deshalb ergibt der Vergleich der drei gezeigten
          Jahre nicht denselben Wert. Investitions- und Kapitalbindungsquote weist der Datenraum
          nur auf LTM-Niveau aus und stehen deshalb über alle Jahre gleich.
        </p>
      )}
      {st.anyEstimated && (
        <p className="finnote ox" style={{ color: "var(--ox)" }}>
          <b>Vorläufige Spalten.</b> Für diese Perioden lag die Detailmitschrift der Engine beim
          Laden noch nicht vor — sie sind hier mit den Formeln des Modells rekonstruiert, die
          Nettoverschuldung am Periodenende ist aber die tatsächliche. Der Server rechnet solche
          Perioden nach und trägt die exakten Beträge nach; nach dem nächsten Halbjahreswechsel
          steht hier die gespielte Zahlenreihe.
        </p>
      )}
    </>
  );
}

/* Schaltfläche mit eigenem Sheet. Das Sheet hängt per Portal in der .pel-Wurzel
   und nicht in der Karte: .card trägt durch die Einblendanimation dauerhaft
   einen transform-Wert, und ein transformierter Vorfahr macht position:fixed
   relativ zu sich selbst — siehe die gleiche Begründung bei Info.           */
export function StatementsButton({ statements, hidden = false, label, className = "" }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [host, setHost] = useState(null);

  useEffect(() => {
    if (!open) return;
    const root = btnRef.current?.closest?.(".pel");
    setHost(root ?? document.body);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!statements) return null;

  return (
    <>
      <button ref={btnRef} className={className} style={{ width: "100%" }}
        onClick={(e) => { e.stopPropagation(); haptic(8); setOpen(true); }}>
        {label}
      </button>
      {open && host && createPortal(
        <StatementsSheet st={statements} hidden={hidden} close={() => setOpen(false)} />, host)}
    </>
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


/* Balkenzeile für die drei Treiber. Positiv nach rechts, negativ nach links,
   gemeinsame Skala — so ist auf einen Blick zu sehen, welcher Treiber das
   Halbjahr gemacht hat und welcher dagegen lief. */
export function DriverBars({ rows }) {
  const scale = Math.max(...rows.map(([, v]) => Math.abs(v)), 0.01);
  return (
    <div className="drv">
      {rows.map(([label, v, hint]) => (
        <div className="drvrow" key={label}>
          <span className="drvlab">{label}</span>
          <span className="drvtrack">
            <i className="drvzero" />
            <i
              className={"drvbar" + (v >= 0 ? " pos" : " neg")}
              style={v >= 0
                ? { left: "50%", width: `${(Math.abs(v) / scale) * 50}%` }
                : { right: "50%", width: `${(Math.abs(v) / scale) * 50}%` }}
            />
          </span>
          <span className="mono drvval" style={{ color: v >= 0 ? "var(--teal)" : "var(--ox)" }}>
            {v >= 0 ? "+" : "−"}{eur(Math.abs(v))}
          </span>
          {hint && <span className="drvhint">{hint}</span>}
        </div>
      ))}
    </div>
  );
}

/* Value Bridge des Fonds. Schließt bewusst auf dieselbe Größe, aus der auch
   TVPI und Wertung gerechnet werden: Gesamtwert abzüglich Carry abzüglich
   abgerufenem Kapital. Damit ist das Vorzeichen der Überschrift dasselbe wie
   das von TVPI − 1 — vorher summierte die Aufstellung nur die Deals, deren
   Exitweg zufällig eine Zerlegung mitgeschrieben hatte (Schlussverkauf und
   Tail-End), und ließ Covenant Breaches, Börsengänge und Teilexits ebenso
   heraus wie Management Fee und Due-Diligence-Kosten. Eine Partie mit einem
   guten Exit und drei Ausfällen stand dann mit einem Gewinn da, während TVPI
   und IRR im Minus waren.

   Was keine eigene Zeile hat, landet in "Fondskosten & Sonstiges": die
   Gebühren, die außerhalb der Beteiligungen anfallen, der Carry und die
   Zerlegung der Deals, die aus einer Partie von vor dem 01.09.2026 stammen
   und noch keine mitgeschrieben haben.                                     */
export function SeasonDrivers({ fund, market, quarter, title = "Woher die Rendite kam" }) {
  if (!fund || !market || !(fund.drawn > 0)) return null;
  const b = fundBridge(fund, market, quarter);

  return (
    <div className="card">
      <h3 className="disp">
        {title}
        <Info t="Value Bridge des Fonds">
          Der Weg vom abgerufenen Kapital zum Wert in den Händen der Investoren, aufgeteilt nach Ursache.
          <b> EBITDA</b> ist das, was die Unternehmen operativ mehr verdienen als beim Einstieg — deine
          Portfolioarbeit. <b>Multiple</b> ist Bewertungsveränderung am Markt: gekauft zu 8×, verkauft zu 10×
          bringt Geld, ohne dass sich im Unternehmen etwas geändert hätte. <b>Entschuldung</b> ist getilgte
          Nettoverschuldung. <b>Fondskosten &amp; Sonstiges</b> sind Management Fee, Due Diligence,
          Transaktionskosten und Carry — alles, was zwischen den Beteiligungen und den Investoren liegt.
          Die Summe ist derselbe Gewinn, aus dem TVPI und Wertung gerechnet werden: Ist sie negativ, steht
          auch der TVPI unter 1,00×. Ein Fonds, dessen Rendite fast nur aus dem Multiple kommt, hatte Glück
          mit dem Markt; einer, der aus EBITDA kommt, hat gearbeitet.
        </Info>
      </h3>
      <div className="pad" style={{ paddingTop: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
          <span className="mono" style={{ fontSize: 20, fontWeight: 600, color: b.gain >= 0 ? "var(--teal)" : "var(--ox)" }}>
            {b.gain >= 0 ? "+" : "−"}{eur(Math.abs(b.gain))}
          </span>
          <span style={{ fontSize: 11, color: "var(--ink2)" }}>
            über {eur(b.drawn)} abgerufenes Kapital · {b.realizedCount} realisierte Beteiligungen
          </span>
        </div>
        <DriverBars rows={[
          ["EBITDA", b.ebitda, null],
          ["Multiple", b.mult, null],
          ["Entschuldung", b.delev, null],
          ...(Math.abs(b.dist) > 0.05 ? [["Rekapitalisierung", b.dist, null]] : []),
          ...(b.openCount ? [["Nicht realisiert", b.unreal, null]] : []),
          ["Fondskosten & Sonstiges", b.rest, null],
        ]} />
      </div>
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

  const last = h[h.length - 1];

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
            <tspan fill={SECCOLOR[c.sector]}>▮</tspan> Umsatz   <tspan style={{ fill: "var(--teal)" }}>▮</tspan> Adj. EBITDA   <tspan style={{ fill: "var(--ink)" }}>▬</tspan> Gesamtwert
          </text>
        </svg>
      </div>
      {/* Die Deltas über die Halteperiode stehen jetzt in PerformanceCompare,
          dort neben denen des letzten Halbjahres — als Vergleich statt als
          zweite, für sich stehende Zahlenreihe. */}
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

/* Glossar der spielspezifischen Kennzahlen. Nur Begriffe, die entweder gar
   nicht aus der PE-Praxis stammen (Assetqualität, Eignung) oder dort anders
   heißen bzw. anders gerechnet werden als hier. Gängige Begriffe wie EBITDA,
   TVPI oder Leverage stehen bewusst nicht darin — die erklärt niemand, der
   das Spiel spielt, gern erklärt bekommen. */
export const GLOSSARY = {
  adjEbitda: {
    t: "Adjusted vs. Reported EBITDA",
    d: <>Das <b>Adjusted EBITDA</b> ist das operative Ergebnis ohne Einmaleffekte — die Zahl, auf die
      ein Käufer sein Multiple ansetzt und auf die der Kreditvertrag seinen Covenant rechnet. Genau sie
      steht überall in dieser Ansicht, im Enterprise Value und im Leverage. Das <b>Reported EBITDA</b>
      liegt darunter: Es enthält die Einmalaufwendungen einer Periode — Programmkosten laufender
      Initiativen, Abfindungen, Signing Bonus, Retainer eines Search-Mandats. In den Financial
      Statements stehen beide untereinander samt Überleitung; die Karte zeigt bewusst nur das
      bereinigte Ergebnis, weil jede Bewertung im Spiel darauf beruht.</>,
  },
  drift: {
    t: "Erwartete Performance vs. Markt",
    d: <>Wächst dieses Unternehmen dauerhaft <b>schneller oder langsamer als sein Sektor</b> — gewinnt es
      also Marktanteile oder verliert es welche? Angegeben in Prozentpunkten Umsatzwachstum pro Jahr
      gegenüber dem Sektorschnitt. <b>+2,0</b> heißt: rund zwei Punkte mehr Wachstum als der Markt, Jahr für
      Jahr. Die Zahl ist eine <b>Schätzung aus dem Datenraum</b>, keine Tatsache; das <b>±-Band</b> dahinter
      ist die Unschärfe. Eine höhere Due-Diligence-Fähigkeit verkleinert das Band, schließt es aber nie.</>,
  },
  quality: {
    t: "Assetqualität",
    d: <>Ein Sammelwert von 0 bis 100 für alles, was ein Unternehmen wertvoll macht, ohne in EBITDA oder
      Marge zu stehen: <b>Kundenbindung, Marktposition, Preissetzungsmacht, Abhängigkeiten</b>. Er wirkt
      direkt auf das Bewertungsmultiple — je höher, desto mehr zahlt ein Käufer je Euro EBITDA. Value
      Creation kann ihn heben, ein Abschwung oder überzogener Leverage drückt ihn.</>,
  },
  conv: {
    t: "Cash Conversion",
    d: <>Wie viel vom EBITDA tatsächlich als Cash übrig bleibt: <b>(EBITDA − Capex − Veränderung Working
      Capital) ÷ EBITDA</b>. Bewusst <b>vor Zinsen und Steuern</b>, damit die Zahl das Unternehmen misst und
      nicht die Finanzierung — so bleibt sie über alle Ziele im Dealflow vergleichbar. Unter 35 % wird es
      eng: dann finanziert das Wachstum sich nicht selbst.</>,
  },
  cov: {
    t: "Covenant",
    d: <>Die <b>Leverage-Obergrenze aus dem Kreditvertrag</b>. Steigt die Nettoverschuldung über dieses
      Vielfache des EBITDA, ist der Covenant gerissen. <b>Zwei Halbjahre in Folge darüber und die
      Kreditgeber übernehmen</b> — das Eigenkapital ist dann vollständig verloren. Die Financing-Fähigkeit
      des Fonds verschafft zusätzlichen Spielraum.</>,
  },
  score: {
    t: "Wertung",
    d: <>Die Kennzahl, nach der die Kohorte rangiert: <b>zur Hälfte TVPI, zur Hälfte IRR</b>, jeweils gegen
      eine Branchenbenchmark normiert. <b>1,00 bedeutet exakt Benchmark-Niveau.</b> Sie beantwortet beide
      Fragen zugleich — wie viel du verdienst und wie lange du dafür brauchst. Ein hoher Multiple nach zehn
      Jahren und ein schneller Exit mit weniger Substanz können dieselbe Wertung ergeben.</>,
  },
  fit: {
    t: "Eignung",
    d: <>Wie gut eine Maßnahme <b>zum konkreten Defizit dieses Unternehmens</b> passt. Ein Cost-out-Programm
      zahlt sich dort aus, wo Marge gegenüber der Branche fehlt, und läuft leer, wo sie schon darüber liegt.
      Über <b>1,0</b> ist die Maßnahme klar angezeigt, unter <b>0,4</b> lohnt sie kaum. Jede Wiederholung
      derselben Maßnahme senkt die Eignung weiter.</>,
  },
  endpressure: {
    t: "Exitfenster",
    d: <>Ab etwa Jahr 8 wissen Käufer, dass dein Fonds auf ein Laufzeitende zuläuft — und <b>preisen genau
      das ein</b>. Der erzielbare Multiple sinkt mit jedem weiteren Halbjahr, unabhängig davon, wie gut das
      Unternehmen läuft. Ein Verkaufsprozess braucht selbst zwei Halbjahre; wer zu spät startet, verkauft
      zwangsläufig in den Abschlag hinein.</>,
  },
  impliedMoM: {
    t: "Implied MoM 5Y",
    d: <>Das Geldvielfache, das dieses Ziel <b>bei deinem aktuellen Gebot und Leverage</b> über fünf Jahre
      abwürfe, wenn du es einfach laufen lässt — der <b>Base Case des Underwritings</b>. Gerechnet wird mit
      derselben Mechanik wie im Spiel: Sektorwachstum plus erwarteter Vorsprung, Margenkonvergenz auf die
      Branche, Capex, Working Capital, Zins, Steuern und Schuldentilgung.
      <br /><br />
      Bewusst konservativ: <b>kein Value-Creation-Programm</b> und <b>Exit zum Einstiegsmultiple</b> —
      Multiple Expansion ist Marktglück, kein Plan. Der Wert bewegt sich mit beiden Reglern: mehr zahlen
      drückt ihn, mehr Fremdkapital hebelt ihn, bis der höhere Zins den Hebel wieder auffrisst.
      Was am Ende über diesem Wert steht, hast du durch Portfolioarbeit verdient.</>,
  },
  dryPowder: {
    t: "Dry Powder",
    d: <>Das Kapital, das du <b>heute noch investieren kannst</b>: offenes Commitment plus einbehaltene
      Erlöse, <b>abzüglich der Gebührenreserve</b>. Die Management Fee liegt innerhalb des Commitments —
      über die Laufzeit rund 70 Mio. €, die von Anfang an reserviert sind. Deshalb sind von 500 Mio. €
      Commitment ohne Recycling nur rund 430 Mio. € tatsächlich investierbar.</>,
  },
};

/* Erklär-Button neben einer Kennzahl. Tippen öffnet die Erklärung als Bottom
   Sheet — siehe die Begründung für Portal und Sheet im Funktionsrumpf. Entweder
   k (Schlüssel aus GLOSSARY) oder t plus children angeben. */
export function Info({ k = null, t = null, children = null }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [host, setHost] = useState(null);
  const entry = k ? GLOSSARY[k] : null;
  const title = t ?? entry?.t;
  const body = children ?? entry?.d;

  /* Das Sheet wird per Portal in die .pel-Wurzel gehängt, nicht dort, wo der
     Button steht. Grund: .card trägt durch die rise-Animation (fill-mode
     both) dauerhaft einen transform-Wert, und ein transformierter Vorfahr
     macht position:fixed relativ zu sich selbst statt zum Viewport — das
     Sheet wäre sonst in der Karte eingesperrt statt über der ganzen Seite.
     Die .pel-Wurzel behält dabei Theme-Klasse und CSS-Variablen. */
  useEffect(() => {
    if (!open) return;
    const root = btnRef.current?.closest?.(".pel");
    setHost(root ?? document.body);
  }, [open]);

  // Zurück-Taste und Escape schließen das Sheet, statt die Seite zu verlassen.
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!body) return null;

  const sheet = (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}
      onClick={() => setOpen(false)}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="infgrip" />
        <div className="infsheet">
          <h4 className="it disp">{title}</h4>
          <div className="ib">{body}</div>
          <button className="ic" onClick={() => { haptic(5); setOpen(false); }}>Verstanden</button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button ref={btnRef} className={"infb" + (open ? " on" : "")} aria-expanded={open}
        aria-label={`${title} erklären`}
        onClick={(e) => { e.stopPropagation(); haptic(5); setOpen(true); }}>i</button>
      {open && host && createPortal(sheet, host)}
    </>
  );
}

/* Fondsprofil: 12 Punkte auf fünf Attribute verteilen, vor dem ersten
   Halbjahr, für die gesamte Laufzeit fest. Eine einzige Definition für
   Einzelspieler-Übungsmodus (components/PeLeagues.tsx) und Mehrspieler-Lobby
   (app/season/[id]/LobbyRoom.tsx), damit beide exakt dasselbe Verhalten
   zeigen — Feld für Feld, Punkt für Punkt.                                */
export const FUND_PROFILE_POINTS = 12;
export const ATTR_FIELDS = [
  ["sourcing", "Origination", "Proprietärer Dealflow je Halbjahr"],
  ["analysis", "Due Diligence", "Schutz vor Post-Closing-Überraschungen"],
  ["negotiation", "Execution", "Bessere Konditionen bei Kauf und Verkauf"],
  ["operations", "Value Creation", "Wirkung und Tempo der Portfolioarbeit"],
  ["financing", "Financing", "Leverage-Kapazität und Kreditmarge"],
];

export function FundProfileEditor({ attrs, setAttrs, points = FUND_PROFILE_POINTS, onSubmit, submitLabel, submitDisabled = false, footer = null }) {
  const used = Object.values(attrs).reduce((a, b) => a + b, 0);
  return (
    <div className="card">
      <h3 className="disp">Fondsprofil</h3>
      <div className="pad">
        <p style={{ fontSize: 13, color: "var(--ink2)", margin: "0 0 14px" }}>
          Verteile {points} Punkte. Diese Entscheidung gilt für die gesamte Fondslaufzeit.
        </p>
        {ATTR_FIELDS.map(([k, n, d]) => (
          <div key={k}>
            <div className="att">
              <div className="an">{n}</div>
              <div className="dots">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} aria-label={`${n} auf ${i}`}
                    className={"dot" + (attrs[k] >= i ? " f" : "")}
                    onClick={() => setAttrs((a) => { const v = a[k] === i ? i - 1 : i; const nu = used - a[k] + v; return nu <= points ? { ...a, [k]: v } : a; })} />
                ))}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink2)", marginTop: -6, marginBottom: 10 }}>{d}</div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <span className="mono" style={{ fontSize: 13, color: used === points ? "var(--teal)" : "var(--ox)" }}>
            {used} / {points} Punkte
          </span>
          <button className="solid" disabled={used !== points || submitDisabled} onClick={onSubmit}>{submitLabel}</button>
        </div>
        {footer}
      </div>
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
                        {" "}(Covenant {x(c.covLimit ?? COV_DEFAULT)} abzüglich {ADDON_HEADROOM.toFixed(1).replace(".", ",")} Puffer)</span></td></tr>
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
                  {!!k.nwcFix && <tr><td className="lab">Cash Release</td>
                    <td style={{ color: "var(--teal)" }}>{eur(Math.abs(k.nwcFix) / 100 * c.revenue)}
                      <span style={{ fontSize: 11, color: "var(--ink2)" }}>
                        {" "}— {Math.abs(k.nwcFix).toFixed(1).replace(".", ",")} pp weniger Kapitalbindung auf {eur(c.revenue)} Umsatz,
                        dazu der Anteil aus dem Reifegradgewinn
                      </span></td></tr>}
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
                <tr><td className="lab">Adj. EBITDA (LTM)</td><td>{eur(eb)}</td></tr>
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

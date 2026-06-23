<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>BrewOps — My Outlet</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Sora:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --cream:#faf6ef;--cream2:#f3ede1;--cream3:#ebe2d0;
  --brown-deep:#1e1408;--brown:#2d1f0e;--brown2:#4a3420;--brown3:#6b4f32;
  --gold:#c8922a;--gold2:#e8b04a;--gold3:#fac775;--gold-dim:rgba(200,146,42,0.12);
  --green:#2d6a4f;--green2:#40916c;--green-light:#d8f3dc;--green-dim:rgba(45,106,79,0.12);
  --red:#9b2226;--red2:#ae2012;--red-light:#fde8e8;--red-dim:rgba(155,34,38,0.1);
  --amber:#ca6702;--amber-light:#fef3c7;--amber-dim:rgba(202,103,2,0.1);
  --blue:#1d4e89;--blue-light:#dbeafe;--blue-dim:rgba(29,78,137,0.1);
  --brand:#8B1A1A;--brand-light:#fdf0f0;--brand-dim:rgba(139,26,26,0.1);
  --text:#1e1408;--text2:#4a3420;--text3:#8b7355;--text4:#b5a48a;
  --border:rgba(30,20,8,0.08);--border2:rgba(30,20,8,0.15);
  --shadow:0 1px 3px rgba(30,20,8,0.08),0 4px 16px rgba(30,20,8,0.06);
  --shadow-lg:0 4px 6px rgba(30,20,8,0.06),0 12px 32px rgba(30,20,8,0.12);
  --shadow-xl:0 16px 48px rgba(30,20,8,0.18);
  --r:16px;--r-sm:10px;--r-xs:6px;
  --nav-h:64px;--topbar-h:60px;
  --font-display:'Playfair Display',serif;--font-body:'Sora',sans-serif;--font-mono:'DM Mono',monospace;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{font-size:14px;-webkit-tap-highlight-color:transparent;}
body{font-family:var(--font-body);background:var(--cream);color:var(--text);min-height:100vh;max-width:480px;margin:0 auto;overflow-x:hidden;position:relative;}

/* TOPBAR */
.topbar{position:sticky;top:0;z-index:100;background:var(--cream);border-bottom:1px solid var(--border);height:var(--topbar-h);display:flex;align-items:center;padding:0 20px;gap:12px;}
.topbar-logo{font-family:var(--font-display);font-size:20px;color:var(--brown);font-weight:700;letter-spacing:-0.01em;flex:1;}
.topbar-logo span{color:var(--gold);}
.outlet-chip{display:flex;align-items:center;gap:6px;background:var(--brown);color:var(--cream);border-radius:20px;padding:5px 12px;font-size:11px;font-family:var(--font-mono);font-weight:500;cursor:pointer;}
.outlet-chip .dot-live{width:6px;height:6px;border-radius:50%;background:var(--green2);animation:live-pulse 2s ease-in-out infinite;}
@keyframes live-pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
.notif-btn{width:36px;height:36px;border-radius:var(--r-sm);border:1px solid var(--border2);background:white;display:flex;align-items:center;justify-content:center;font-size:17px;cursor:pointer;position:relative;flex-shrink:0;}
.notif-dot{position:absolute;top:7px;right:7px;width:7px;height:7px;border-radius:50%;background:var(--red);border:1.5px solid var(--cream);}
.notif-count{position:absolute;top:4px;right:4px;background:var(--red);color:white;font-size:8px;font-family:var(--font-mono);font-weight:700;min-width:15px;height:15px;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 3px;border:1.5px solid var(--cream);}

/* CONTENT */
.content{padding:0 16px calc(var(--nav-h) + 24px);}

/* PAGES */
.page{display:none;}
.page.active{display:block;}

/* BOTTOM NAV */
.bottom-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;height:var(--nav-h);background:var(--brown-deep);display:flex;align-items:stretch;z-index:200;border-top:1px solid rgba(255,255,255,0.08);}
.nav-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;color:rgba(255,255,255,0.35);transition:color 0.15s;position:relative;-webkit-tap-highlight-color:transparent;}
.nav-tab.active{color:var(--gold2);}
.nav-tab.active::before{content:'';position:absolute;top:0;left:15%;right:15%;height:2px;background:var(--gold);border-radius:0 0 3px 3px;}
.nav-icon{font-size:20px;line-height:1;}
.nav-label{font-size:9px;font-family:var(--font-mono);letter-spacing:0.04em;}
.nav-badge{position:absolute;top:8px;right:12px;background:var(--red);color:white;font-size:9px;font-family:var(--font-mono);font-weight:500;min-width:16px;height:16px;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 3px;border:1.5px solid var(--brown-deep);}
.nav-badge.green-badge{background:var(--green2);}
.nav-badge.pulse{animation:badgePulse 1.2s ease-in-out infinite;}
@keyframes badgePulse{0%,100%{transform:scale(1);}50%{transform:scale(1.3);}}

/* GREETING */
.greeting-block{padding:20px 0 4px;animation:fadeUp 0.4s ease both;}
.greeting-time{font-size:11px;font-family:var(--font-mono);color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;}
.greeting-name{font-family:var(--font-display);font-size:26px;color:var(--brown);font-weight:700;line-height:1.1;margin-bottom:2px;}
.greeting-name em{color:var(--gold);font-style:italic;}
.greeting-sub{font-size:12px;color:var(--text3);}

/* DAILY HERO */
.daily-hero{background:var(--brown);border-radius:var(--r);padding:20px;margin:16px 0;position:relative;overflow:hidden;box-shadow:var(--shadow-lg);animation:fadeUp 0.4s 0.05s ease both;}
.daily-hero::before{content:'☕';position:absolute;right:-10px;top:-10px;font-size:90px;opacity:0.06;line-height:1;}
.hero-label{font-size:10px;font-family:var(--font-mono);color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;}
.hero-cups{font-family:var(--font-display);font-size:52px;font-weight:700;color:white;line-height:1;margin-bottom:4px;}
.hero-cups span{font-size:20px;color:rgba(255,255,255,0.5);font-weight:400;}
.hero-revenue{font-size:22px;color:var(--gold3);font-weight:600;font-family:var(--font-mono);margin-bottom:16px;}
.hero-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,0.1);border-radius:var(--r-sm);overflow:hidden;}
.hero-stat{background:rgba(255,255,255,0.06);padding:10px 8px;text-align:center;}
.hero-stat-val{font-size:15px;font-weight:600;color:white;font-family:var(--font-mono);}
.hero-stat-lbl{font-size:9px;color:rgba(255,255,255,0.4);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.06em;margin-top:2px;}
.hero-stat.live-orders{background:rgba(45,106,79,0.3);}
.hero-stat.live-orders .hero-stat-val{color:#5dcaa5;}

/* QUICK ACTIONS */
.section-label{font-size:10px;font-family:var(--font-mono);color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin:20px 0 10px;}
.quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;animation:fadeUp 0.4s 0.1s ease both;}
.quick-btn{background:white;border:1px solid var(--border);border-radius:var(--r);padding:16px 10px 14px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;box-shadow:var(--shadow);transition:all 0.15s;-webkit-tap-highlight-color:transparent;user-select:none;position:relative;}
.quick-btn:active{transform:scale(0.96);box-shadow:none;}
.quick-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;}
.quick-label{font-size:11px;font-weight:500;color:var(--text2);text-align:center;line-height:1.3;}
.qi-sale{background:#fff8e6;}
.qi-stock{background:var(--green-light);}
.qi-machine{background:#fff0e6;}
.qi-waste{background:var(--red-light);}
.qi-payment{background:var(--blue-light);}
.qi-issue{background:#fce7f3;}
.qi-orders{background:#e8f4fb;}
.quick-btn-badge{position:absolute;top:10px;right:10px;background:var(--red);color:white;font-size:9px;font-family:var(--font-mono);min-width:16px;height:16px;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 3px;font-weight:700;}
.quick-btn-badge.green{background:var(--green2);}

/* CARDS */
.card{background:white;border:1px solid var(--border);border-radius:var(--r);overflow:hidden;box-shadow:var(--shadow);margin-bottom:12px;animation:fadeUp 0.4s ease both;}
.card-head{padding:14px 16px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;}
.card-title{font-size:13px;font-weight:600;color:var(--brown);flex:1;}
.card-sub{font-size:11px;color:var(--text3);font-family:var(--font-mono);}
.card-body{padding:14px 16px;}

/* STATUS STRIP */
.status-strip{display:flex;gap:8px;margin-bottom:12px;animation:fadeUp 0.4s 0.15s ease both;overflow-x:auto;padding-bottom:2px;-ms-overflow-style:none;scrollbar-width:none;}
.status-strip::-webkit-scrollbar{display:none;}
.status-chip{display:flex;align-items:center;gap:6px;background:white;border:1px solid var(--border);border-radius:20px;padding:6px 12px;font-size:11px;font-family:var(--font-mono);white-space:nowrap;box-shadow:var(--shadow);flex-shrink:0;}
.status-chip .dot{width:6px;height:6px;border-radius:50%;}
.sc-green{color:var(--green);}
.sc-amber{color:var(--amber);}
.sc-red{color:var(--red);}
.sc-blue{color:var(--blue);}
.sc-dot-green{background:var(--green2);}
.sc-dot-amber{background:var(--amber);}
.sc-dot-red{background:var(--red);}
.sc-dot-blue{background:var(--blue);}

/* LIVE ORDER ITEMS */
.live-order-item{border-radius:var(--r);overflow:hidden;margin-bottom:10px;border:1px solid var(--border);background:white;box-shadow:var(--shadow);transition:all 0.2s;}
.live-order-item.new-order{border-color:var(--green2);animation:orderSlideIn 0.4s ease;}
.live-order-item.cash-pending{border-color:var(--amber);border-width:2px;}
.live-order-item.ready-to-serve{border-color:var(--blue);}
@keyframes orderSlideIn{from{opacity:0;transform:translateX(-16px);}to{opacity:1;transform:translateX(0);}}
.loi-head{display:flex;align-items:center;gap:10px;padding:12px 14px 10px;border-bottom:1px solid var(--border);}
.loi-num{font-family:var(--font-mono);font-size:12px;font-weight:600;color:var(--gold);}
.loi-mode{font-size:10px;font-family:var(--font-mono);padding:2px 7px;border-radius:4px;flex-shrink:0;}
.lm-pickup{background:var(--green-dim);color:var(--green);}
.lm-delivery{background:var(--blue-dim);color:var(--blue);}
.loi-time{font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-left:auto;}
.loi-status{font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;flex-shrink:0;}
.ls-new{background:var(--green-dim);color:var(--green);}
.ls-cash{background:var(--amber-dim);color:var(--amber);}
.ls-prep{background:var(--blue-dim);color:var(--blue);}
.ls-ready{background:var(--green-dim);color:var(--green);}
.ls-done{background:rgba(30,20,8,0.06);color:var(--text3);}
.loi-body{padding:10px 14px;}
.loi-item-row{display:flex;align-items:center;gap:10px;padding:4px 0;}
.loi-emoji{font-size:18px;width:24px;text-align:center;flex-shrink:0;}
.loi-item-name{font-size:13px;font-weight:500;flex:1;}
.loi-item-detail{font-size:11px;color:var(--text3);}
.loi-item-qty{font-size:12px;font-family:var(--font-mono);color:var(--text3);}
.loi-item-price{font-size:13px;font-family:var(--font-mono);font-weight:600;color:var(--gold);}
.cash-alert-bar{background:var(--amber-dim);border-top:1px solid rgba(202,103,2,0.2);padding:10px 14px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--amber);font-weight:500;}
.loi-foot{display:flex;align-items:center;gap:8px;padding:10px 14px;border-top:1px solid var(--border);}
.loi-payment{font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:4px;flex-shrink:0;}
.lp-card{background:var(--blue-dim);color:var(--blue);}
.lp-cash{background:var(--amber-dim);color:var(--amber);}
.lp-qr{background:rgba(127,119,221,0.12);color:#534AB7;}
.loi-total{font-size:14px;font-weight:700;font-family:var(--font-mono);color:var(--brown);margin-left:auto;}
.loi-action{padding:8px 16px;border-radius:30px;border:none;font-size:12px;font-weight:600;font-family:var(--font-body);cursor:pointer;transition:all 0.15s;-webkit-tap-highlight-color:transparent;}
.la-confirm{background:var(--green);color:white;}
.la-prepare{background:var(--blue);color:white;}
.la-ready{background:var(--brown);color:white;}
.la-cash{background:var(--amber);color:var(--brown-deep);}
.la-done{background:var(--cream3);color:var(--text3);}

/* ORDER FILTERS */
.order-filter-row{display:flex;gap:7px;overflow-x:auto;padding:2px;margin-bottom:14px;-ms-overflow-style:none;scrollbar-width:none;}
.order-filter-row::-webkit-scrollbar{display:none;}
.of-chip{padding:6px 14px;border-radius:20px;border:1px solid var(--border2);background:white;font-size:11px;font-family:var(--font-mono);cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all 0.15s;}
.of-chip.active{background:var(--brown);color:var(--cream);border-color:var(--brown);}

/* CASH CONFIRMATION MODAL CARD */
.cash-confirm-popup{position:fixed;top:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;z-index:300;background:var(--amber);padding:14px 20px;display:flex;align-items:center;gap:12px;box-shadow:var(--shadow-xl);transition:transform 0.4s ease;transform:translateX(-50%) translateY(-100%);}
.cash-confirm-popup.show{transform:translateX(-50%) translateY(0);}
.ccp-icon{font-size:28px;flex-shrink:0;}
.ccp-text{flex:1;}
.ccp-title{font-size:14px;font-weight:700;color:var(--brown-deep);}
.ccp-sub{font-size:11px;color:rgba(30,20,8,0.7);font-family:var(--font-mono);margin-top:1px;}
.ccp-confirm{background:var(--brown-deep);color:white;border:none;border-radius:20px;padding:8px 16px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.ccp-dismiss{background:rgba(30,20,8,0.15);color:var(--brown-deep);border:none;border-radius:20px;padding:8px 12px;font-size:12px;font-weight:500;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}

/* NEW ORDER POPUP */
.new-order-popup{position:fixed;bottom:calc(var(--nav-h) + 12px);left:50%;transform:translateX(-50%) translateY(20px);width:calc(100% - 32px);max-width:448px;z-index:290;background:var(--brown-deep);border:1px solid rgba(45,106,79,0.4);border-radius:var(--r);padding:14px 16px;display:flex;align-items:center;gap:12px;box-shadow:var(--shadow-xl);opacity:0;transition:all 0.35s ease;pointer-events:none;}
.new-order-popup.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:all;}
.new-order-popup::before{content:'';position:absolute;top:-1px;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--green2),transparent 60%);border-radius:var(--r) var(--r) 0 0;}
.nop-pulse{width:10px;height:10px;border-radius:50%;background:var(--green2);box-shadow:0 0 10px var(--green2);animation:live-pulse 1.2s infinite;flex-shrink:0;}
.nop-text{flex:1;}
.nop-label{font-size:10px;font-family:var(--font-mono);color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;}
.nop-title{font-size:14px;font-weight:600;color:white;}
.nop-sub{font-size:11px;color:rgba(255,255,255,0.5);font-family:var(--font-mono);}
.nop-btn{background:var(--green);color:white;border:none;border-radius:20px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}

/* STOCKS */
.stock-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);}
.stock-item:last-child{border-bottom:none;}
.stock-emoji{font-size:20px;width:28px;text-align:center;flex-shrink:0;}
.stock-name{font-size:13px;font-weight:500;flex:1;}
.stock-sub{font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-top:1px;}
.stock-pct{font-size:13px;font-family:var(--font-mono);font-weight:600;flex-shrink:0;width:36px;text-align:right;}
.stock-bar-wrap{width:60px;flex-shrink:0;}
.sbar{height:6px;border-radius:3px;background:var(--cream3);overflow:hidden;}
.sbar-fill{height:100%;border-radius:3px;}
.sb-green{background:var(--green2);}
.sb-amber{background:var(--amber);}
.sb-red{background:var(--red);}
.pct-green{color:var(--green);}
.pct-amber{color:var(--amber);}
.pct-red{color:var(--red);}

/* MACHINE CHECKLIST */
.check-item{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer;-webkit-tap-highlight-color:transparent;}
.check-item:last-child{border-bottom:none;}
.check-box{width:24px;height:24px;border-radius:7px;border:2px solid var(--border2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;font-size:13px;}
.check-box.done{background:var(--green);border-color:var(--green);color:white;}
.check-text{flex:1;}
.check-title{font-size:13px;font-weight:500;}
.check-sub{font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-top:1px;}
.check-time{font-size:11px;color:var(--text3);font-family:var(--font-mono);flex-shrink:0;}

/* BEV ITEMS */
.bev-item{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);}
.bev-item:last-child{border-bottom:none;}
.bev-color{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.bev-name{font-size:13px;flex:1;}
.bev-count{font-size:13px;font-family:var(--font-mono);font-weight:600;color:var(--brown);}
.bev-bar-wrap{width:70px;}
.bev-sbar{height:5px;border-radius:3px;background:var(--cream3);overflow:hidden;}
.bev-fill{height:100%;border-radius:3px;background:var(--gold);}
.bev-pct{font-size:11px;color:var(--text3);font-family:var(--font-mono);width:30px;text-align:right;flex-shrink:0;}

/* PAY ITEMS */
.pay-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);}
.pay-item:last-child{border-bottom:none;}
.pay-method{font-size:10px;font-family:var(--font-mono);font-weight:500;padding:3px 8px;border-radius:5px;flex-shrink:0;}
.pm-card{background:var(--blue-light);color:var(--blue);}
.pm-cash{background:var(--green-light);color:var(--green);}
.pm-qr{background:var(--amber-light);color:var(--amber);}
.pay-desc{font-size:12px;flex:1;color:var(--text2);}
.pay-time{font-size:11px;color:var(--text3);font-family:var(--font-mono);}
.pay-amount{font-size:13px;font-weight:600;font-family:var(--font-mono);color:var(--brown);}

/* RENT */
.rent-card{border-radius:var(--r);padding:16px;margin-bottom:12px;position:relative;overflow:hidden;}
.rent-card.due-soon{background:var(--amber-light);border:1px solid rgba(202,103,2,0.2);}
.rent-card.ok{background:var(--green-light);border:1px solid rgba(45,106,79,0.2);}
.rent-label{font-size:10px;font-family:var(--font-mono);color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;}
.rent-amount{font-size:24px;font-weight:700;font-family:var(--font-mono);color:var(--brown);}
.rent-due{font-size:13px;color:var(--text2);margin-top:4px;}
.rent-last{font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-top:2px;}
.rent-countdown{position:absolute;right:16px;top:50%;transform:translateY(-50%);text-align:right;}
.countdown-num{font-size:36px;font-weight:700;font-family:var(--font-display);color:var(--amber);line-height:1;}
.countdown-lbl{font-size:10px;color:var(--text3);font-family:var(--font-mono);}

/* COUPONS */
.coupon-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);}
.coupon-item:last-child{border-bottom:none;}
.coupon-code{font-family:var(--font-mono);font-size:12px;font-weight:500;background:var(--gold-dim);color:var(--gold);border:1px solid rgba(200,146,42,0.2);border-radius:var(--r-xs);padding:3px 9px;flex-shrink:0;min-width:80px;text-align:center;}
.coupon-desc{font-size:12px;flex:1;color:var(--text2);}
.coupon-count{font-size:12px;font-family:var(--font-mono);color:var(--text3);}
.coupon-disc{font-size:12px;font-family:var(--font-mono);color:var(--red);font-weight:500;}

/* WASTE */
.waste-item{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);}
.waste-item:last-child{border-bottom:none;}
.waste-cat{font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:4px;flex-shrink:0;}
.wc-disposed{background:var(--red-light);color:var(--red);}
.wc-spilled{background:var(--amber-light);color:var(--amber);}
.waste-name{font-size:12px;flex:1;color:var(--text2);}
.waste-qty{font-size:12px;font-family:var(--font-mono);color:var(--brown);font-weight:600;}
.waste-cost{font-size:11px;font-family:var(--font-mono);color:var(--red);}

/* SUM ROWS */
.sum-row{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);}
.sum-row:last-child{border-bottom:none;}
.sum-label{font-size:13px;color:var(--text2);}
.sum-val{font-size:13px;font-weight:600;font-family:var(--font-mono);color:var(--brown);}
.sum-val.green{color:var(--green);}
.sum-val.red{color:var(--red);}
.sum-val.amber{color:var(--amber);}
.sum-val.blue{color:var(--blue);}

/* COMPLAINTS */
.complaint-item{padding:12px 0;border-bottom:1px solid var(--border);}
.complaint-item:last-child{border-bottom:none;}
.comp-header{display:flex;align-items:center;gap:8px;margin-bottom:5px;}
.sev-pill{font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:20px;}
.sp-high{background:var(--red-light);color:var(--red);}
.sp-med{background:var(--amber-light);color:var(--amber);}
.sp-low{background:var(--green-light);color:var(--green);}
.comp-time{font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-left:auto;}
.comp-text{font-size:13px;color:var(--text2);line-height:1.5;}
.comp-status{font-size:11px;font-family:var(--font-mono);color:var(--text3);margin-top:4px;}

/* MODALS */
.modal-overlay{display:none;position:fixed;inset:0;max-width:480px;margin:0 auto;background:rgba(30,20,8,0.6);backdrop-filter:blur(4px);z-index:500;align-items:flex-end;}
.modal-overlay.open{display:flex;}
.modal-sheet{background:var(--cream);border-radius:var(--r) var(--r) 0 0;width:100%;max-height:88vh;overflow-y:auto;animation:sheetUp 0.3s ease;}
@keyframes sheetUp{from{transform:translateY(100%);}to{transform:translateY(0);}}
.sheet-handle{width:36px;height:4px;background:var(--border2);border-radius:2px;margin:10px auto 0;}
.sheet-head{padding:12px 20px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;}
.sheet-title{font-size:16px;font-weight:700;font-family:var(--font-display);color:var(--brown);flex:1;}
.sheet-close{width:28px;height:28px;border-radius:50%;border:1px solid var(--border2);background:white;color:var(--text3);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;}
.sheet-body{padding:16px 20px 24px;}
.form-group{margin-bottom:14px;}
.form-label{font-size:11px;font-family:var(--font-mono);color:var(--text3);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:5px;display:block;}
.form-input{width:100%;padding:11px 14px;background:white;border:1px solid var(--border2);border-radius:var(--r-sm);font-size:14px;font-family:var(--font-body);color:var(--text);outline:none;transition:border-color 0.15s;appearance:none;}
.form-input:focus{border-color:var(--gold);}
.form-select{width:100%;padding:11px 14px;background:white;border:1px solid var(--border2);border-radius:var(--r-sm);font-size:14px;font-family:var(--font-body);color:var(--text);outline:none;appearance:none;cursor:pointer;}
.form-textarea{width:100%;padding:11px 14px;background:white;border:1px solid var(--border2);border-radius:var(--r-sm);font-size:14px;font-family:var(--font-body);color:var(--text);outline:none;resize:none;min-height:80px;}
.form-textarea:focus{border-color:var(--gold);}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.bev-picker{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.bev-pick-btn{padding:10px 6px;background:white;border:2px solid var(--border);border-radius:var(--r-sm);text-align:center;cursor:pointer;transition:all 0.12s;-webkit-tap-highlight-color:transparent;}
.bev-pick-btn.selected{border-color:var(--gold);background:var(--gold-dim);}
.bev-pick-btn .bicon{font-size:20px;margin-bottom:4px;}
.bev-pick-btn .bname{font-size:11px;font-weight:500;color:var(--text2);}
.stepper{display:flex;align-items:center;gap:12px;background:white;border:1px solid var(--border2);border-radius:var(--r-sm);padding:4px;}
.step-btn{width:36px;height:36px;border-radius:var(--r-xs);border:none;background:var(--cream2);font-size:20px;color:var(--brown);cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:300;transition:background 0.12s;}
.step-val{flex:1;text-align:center;font-size:22px;font-weight:700;font-family:var(--font-mono);color:var(--brown);}
.method-picker{display:flex;gap:8px;}
.method-btn{flex:1;padding:10px 6px;background:white;border:2px solid var(--border);border-radius:var(--r-sm);text-align:center;cursor:pointer;font-size:12px;font-weight:500;color:var(--text2);transition:all 0.12s;}
.method-btn.selected{border-color:var(--gold);background:var(--gold-dim);color:var(--brown);}
.submit-btn{width:100%;padding:14px;background:var(--brown);color:var(--cream);border:none;border-radius:var(--r-sm);font-size:15px;font-weight:600;font-family:var(--font-body);cursor:pointer;margin-top:8px;transition:background 0.15s;-webkit-tap-highlight-color:transparent;}
.submit-btn:active{background:var(--brown2);}
.submit-btn.gold{background:var(--gold);color:var(--brown-deep);}
.submit-btn.green{background:var(--green);}
.submit-btn.red{background:var(--red);}

/* AI TIP */
.ai-tip{background:linear-gradient(135deg,#e8f5ee 0%,#f0faf4 100%);border:1px solid rgba(45,106,79,0.2);border-radius:var(--r);padding:14px 16px;margin-bottom:12px;display:flex;gap:12px;align-items:flex-start;animation:fadeUp 0.4s 0.2s ease both;}
.ai-tip-icon{width:32px;height:32px;background:var(--green2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;color:white;}
.ai-tip-label{font-size:10px;font-family:var(--font-mono);color:var(--green);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;}
.ai-tip-text{font-size:12px;color:var(--green);line-height:1.55;}

/* ALERT BANNER */
.alert-banner{border-radius:var(--r);padding:12px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;font-size:12px;font-weight:500;}
.ab-red{background:var(--red-light);color:var(--red);border:1px solid rgba(155,34,38,0.15);}
.ab-amber{background:var(--amber-light);color:var(--amber);border:1px solid rgba(202,103,2,0.15);}
.ab-green{background:var(--green-light);color:var(--green);border:1px solid rgba(45,106,79,0.15);}
.ab-icon{font-size:18px;flex-shrink:0;}
.ab-text{flex:1;line-height:1.4;}

/* PILL */
.pill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-family:var(--font-mono);font-weight:500;}
.pill-green{background:var(--green-light);color:var(--green);}
.pill-amber{background:var(--amber-light);color:var(--amber);}
.pill-red{background:var(--red-light);color:var(--red);}
.pill-blue{background:var(--blue-light);color:var(--blue);}

/* TOAST */
.toast{position:fixed;bottom:calc(var(--nav-h) + 12px);left:50%;transform:translateX(-50%) translateY(20px);background:var(--brown-deep);color:white;padding:10px 18px;border-radius:30px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:8px;z-index:999;opacity:0;transition:all 0.25s ease;white-space:nowrap;box-shadow:var(--shadow-xl);pointer-events:none;}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

/* ANIMATIONS */
@keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
.page.active .card:nth-child(1){animation-delay:0.02s;}
.page.active .card:nth-child(2){animation-delay:0.06s;}
.page.active .card:nth-child(3){animation-delay:0.10s;}
.page.active .card:nth-child(4){animation-delay:0.14s;}

@media(min-width:480px){body{border-left:1px solid var(--border);border-right:1px solid var(--border);box-shadow:0 0 60px rgba(0,0,0,0.1);}
.modal-overlay{left:50%;transform:translateX(-50%);right:auto;width:480px;}
.cash-confirm-popup,.new-order-popup{width:480px;}
.new-order-popup{width:calc(480px - 32px);}
.bottom-nav{left:50%;}}
</style>
</head>
<body>
<!-- ══ LOGIN GATE — blocks all content until authenticated ══ -->
<div id="auth-gate" style="position:fixed;inset:0;z-index:9999;background:var(--bg,#FBF6EE);display:flex;flex-direction:column;justify-content:center;padding:32px 24px;font-family:var(--font-display,serif);">
  <div style="max-width:380px;margin:0 auto;width:100%;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:28px;font-weight:700;color:var(--brand,#8B1A1A);font-family:var(--font-display,serif);">BrewOps</div>
      <div style="color:var(--text3,#8b7355);font-size:13px;margin-top:4px;">Franchisee Portal</div>
    </div>

    <div id="auth-tabs" style="display:flex;gap:8px;margin-bottom:20px;background:rgba(0,0,0,0.04);border-radius:10px;padding:4px;">
      <button id="auth-tab-login" onclick="switchAuthTab('login')" style="flex:1;padding:10px;border:none;border-radius:8px;background:var(--brand,#8B1A1A);color:white;font-weight:600;font-size:14px;cursor:pointer;">Log In</button>
      <button id="auth-tab-signup" onclick="switchAuthTab('signup')" style="flex:1;padding:10px;border:none;border-radius:8px;background:transparent;color:var(--text2,#4a3420);font-weight:600;font-size:14px;cursor:pointer;">Sign Up</button>
    </div>

    <div id="auth-error" style="display:none;background:#fee;color:#a33;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;"></div>

    <!-- LOGIN FORM -->
    <div id="auth-form-login">
      <input type="email" id="login-email" placeholder="Email" style="width:100%;padding:13px 14px;border:1px solid var(--border2,#ddd);border-radius:10px;margin-bottom:10px;font-size:14px;box-sizing:border-box;">
      <input type="password" id="login-password" placeholder="Password" style="width:100%;padding:13px 14px;border:1px solid var(--border2,#ddd);border-radius:10px;margin-bottom:16px;font-size:14px;box-sizing:border-box;">
      <button onclick="doLogin()" id="login-btn" style="width:100%;padding:14px;border:none;border-radius:10px;background:var(--brand,#8B1A1A);color:white;font-weight:700;font-size:15px;cursor:pointer;">Log In</button>
    </div>

    <!-- SIGNUP FORM (requires invite code) -->
    <div id="auth-form-signup" style="display:none;">
      <input type="text" id="signup-name" placeholder="Full name" style="width:100%;padding:13px 14px;border:1px solid var(--border2,#ddd);border-radius:10px;margin-bottom:10px;font-size:14px;box-sizing:border-box;">
      <input type="email" id="signup-email" placeholder="Email" style="width:100%;padding:13px 14px;border:1px solid var(--border2,#ddd);border-radius:10px;margin-bottom:10px;font-size:14px;box-sizing:border-box;">
      <input type="password" id="signup-password" placeholder="Password (min 6 characters)" style="width:100%;padding:13px 14px;border:1px solid var(--border2,#ddd);border-radius:10px;margin-bottom:10px;font-size:14px;box-sizing:border-box;">
      <input type="text" id="signup-invite" placeholder="Invite code (from your franchisor)" style="width:100%;padding:13px 14px;border:1px solid var(--border2,#ddd);border-radius:10px;margin-bottom:16px;font-size:14px;box-sizing:border-box;text-transform:uppercase;">
      <button onclick="doSignup()" id="signup-btn" style="width:100%;padding:14px;border:none;border-radius:10px;background:var(--brand,#8B1A1A);color:white;font-weight:700;font-size:15px;cursor:pointer;">Create Account</button>
    </div>
  </div>
</div>


<!-- CASH CONFIRM POPUP (slides from top) -->
<div class="cash-confirm-popup" id="cash-confirm-popup">
  <div class="ccp-icon">💵</div>
  <div class="ccp-text">
    <div class="ccp-title" id="ccp-title">Cash Payment — ORD-4819</div>
    <div class="ccp-sub" id="ccp-sub">Latte × 1 · LKR 520 · Confirm cash received?</div>
  </div>
  <button class="ccp-confirm" onclick="confirmCash()">✓ Received</button>
  <button class="ccp-dismiss" onclick="dismissCash()">Dismiss</button>
</div>

<!-- NEW ORDER POPUP (slides from bottom above nav) -->
<div class="new-order-popup" id="new-order-popup">
  <div class="nop-pulse"></div>
  <div class="nop-text">
    <div class="nop-label">New customer order</div>
    <div class="nop-title" id="nop-title">Flat White × 2 + Cold Brew</div>
    <div class="nop-sub" id="nop-sub">Card payment · LKR 1,590 · Pickup</div>
  </div>
  <button class="nop-btn" onclick="goToOrders()">View →</button>
</div>

<!-- TOPBAR -->
<div class="topbar">
  <div class="topbar-logo">Brew<span>Ops</span></div>
  <div class="outlet-chip"><div class="dot-live"></div>Colombo 03</div>
  <div class="notif-btn" id="notif-btn" onclick="navigate('alerts')">
    🔔
    <div class="notif-count" id="notif-count">3</div>
  </div>
</div>

<!-- CONTENT -->
<div class="content">

  <!-- HOME PAGE -->
  <div class="page active" id="page-home">
    <div class="greeting-block">
      <div class="greeting-time" id="greeting-time"></div>
      <div class="greeting-name">Good morning, <em>Nimal.</em></div>
      <div class="greeting-sub">Colombo 03 · Colpetty · Open since 7:00 AM</div>
    </div>

    <div class="daily-hero">
      <div class="hero-label">Today's performance</div>
      <div class="hero-cups">247 <span>cups</span></div>
      <div class="hero-revenue">LKR 18,400</div>
      <div class="hero-stats">
        <div class="hero-stat"><div class="hero-stat-val">LKR 74</div><div class="hero-stat-lbl">Avg/Cup</div></div>
        <div class="hero-stat"><div class="hero-stat-val">3</div><div class="hero-stat-lbl">Cleans</div></div>
        <div class="hero-stat"><div class="hero-stat-val">1</div><div class="hero-stat-lbl">Flushes</div></div>
        <div class="hero-stat live-orders"><div class="hero-stat-val" id="live-order-hero">4</div><div class="hero-stat-lbl">Live Orders</div></div>
      </div>
    </div>

    <div class="status-strip">
      <div class="status-chip sc-green"><div class="dot sc-dot-green"></div>Machine OK</div>
      <div class="status-chip sc-amber"><div class="dot sc-dot-amber"></div>Cup lids 38%</div>
      <div class="status-chip sc-blue"><div class="dot sc-dot-blue"></div>4 live orders</div>
      <div class="status-chip sc-green"><div class="dot sc-dot-green"></div>Rent OK — 21d</div>
      <div class="status-chip sc-red"><div class="dot sc-dot-red"></div>1 open issue</div>
    </div>

    <div class="ai-tip">
      <div class="ai-tip-icon">◎</div>
      <div>
        <div class="ai-tip-label">AI Insight for you</div>
        <div class="ai-tip-text">You have 4 active orders from the customer app. Flat White demand is up 34% this week — ensure stock is sufficient. Iced Latte trending at network level — check your cold brew stock.</div>
      </div>
    </div>

    <div class="section-label">Quick actions</div>
    <div class="quick-grid">
      <div class="quick-btn" onclick="navigate('orders')">
        <div class="quick-icon qi-orders">⚡</div>
        <div class="quick-label">Live Orders</div>
        <div class="quick-btn-badge green" id="orders-quick-badge">4</div>
      </div>
      <div class="quick-btn" onclick="openSaleModal()">
        <div class="quick-icon qi-sale">☕</div>
        <div class="quick-label">Log Walk-in</div>
      </div>
      <div class="quick-btn" onclick="navigate('stock')">
        <div class="quick-icon qi-stock">📦</div>
        <div class="quick-label">Update Stock</div>
      </div>
      <div class="quick-btn" onclick="openMachineModal()">
        <div class="quick-icon qi-machine">🔧</div>
        <div class="quick-label">Machine Log</div>
      </div>
      <div class="quick-btn" onclick="navigate('finance')">
        <div class="quick-icon qi-payment">💳</div>
        <div class="quick-label">Payments</div>
      </div>
      <div class="quick-btn" onclick="openIssueModal()">
        <div class="quick-icon qi-issue">⚠️</div>
        <div class="quick-label">Report Issue</div>
      </div>
    </div>

    <div class="section-label" style="margin-top:20px">Today's beverages</div>
    <div class="card">
      <div class="card-head"><div class="card-title">Sales by Beverage</div><div class="card-sub">247 cups total</div></div>
      <div class="card-body" style="padding:8px 16px">
        <div class="bev-item"><div class="bev-color" style="background:#c8922a"></div><div class="bev-name">Flat White</div><div class="bev-bar-wrap"><div class="bev-sbar"><div class="bev-fill" style="width:100%"></div></div></div><div class="bev-count">84</div><div class="bev-pct">34%</div></div>
        <div class="bev-item"><div class="bev-color" style="background:#1d4e89"></div><div class="bev-name">Latte</div><div class="bev-bar-wrap"><div class="bev-sbar"><div class="bev-fill" style="width:73%;background:#1d4e89"></div></div></div><div class="bev-count">62</div><div class="bev-pct">25%</div></div>
        <div class="bev-item"><div class="bev-color" style="background:#2d6a4f"></div><div class="bev-name">Espresso</div><div class="bev-bar-wrap"><div class="bev-sbar"><div class="bev-fill" style="width:55%;background:#2d6a4f"></div></div></div><div class="bev-count">47</div><div class="bev-pct">19%</div></div>
        <div class="bev-item"><div class="bev-color" style="background:#6b4f32"></div><div class="bev-name">Cappuccino</div><div class="bev-bar-wrap"><div class="bev-sbar"><div class="bev-fill" style="width:35%;background:#6b4f32"></div></div></div><div class="bev-count">30</div><div class="bev-pct">12%</div></div>
        <div class="bev-item"><div class="bev-color" style="background:#ca6702"></div><div class="bev-name">Iced Latte</div><div class="bev-bar-wrap"><div class="bev-sbar"><div class="bev-fill" style="width:18%;background:#ca6702"></div></div></div><div class="bev-count">24</div><div class="bev-pct">10%</div></div>
      </div>
    </div>

    <div class="section-label" style="margin-top:8px">Recent walk-in transactions</div>
    <div class="card">
      <div class="card-body" style="padding:4px 16px">
        <div class="pay-item"><span class="pay-method pm-card">Card</span><div class="pay-desc">Flat White × 2</div><div class="pay-time">14:32</div><div class="pay-amount">LKR 1,400</div></div>
        <div class="pay-item"><span class="pay-method pm-qr">QR</span><div class="pay-desc">Latte × 1 — BREW20</div><div class="pay-time">14:18</div><div class="pay-amount">LKR 560</div></div>
        <div class="pay-item"><span class="pay-method pm-cash">Cash</span><div class="pay-desc">Espresso × 3</div><div class="pay-time">13:55</div><div class="pay-amount">LKR 1,050</div></div>
      </div>
    </div>
  </div>

  <!-- LIVE ORDERS PAGE -->
  <div class="page" id="page-orders">
    <div class="greeting-block">
      <div class="greeting-name" style="font-size:22px">Live Orders</div>
      <div class="greeting-sub" id="orders-page-sub">4 active orders from customer app · Colombo 03</div>
    </div>

    <div class="alert-banner ab-green">
      <div class="ab-icon">⚡</div>
      <div class="ab-text">All customer app orders appear here instantly. Confirm, prepare, then mark ready for customer pickup or delivery.</div>
    </div>

    <div class="order-filter-row">
      <div class="of-chip active" onclick="filterOrders('all',this)">All</div>
      <div class="of-chip" onclick="filterOrders('cash',this)">💵 Cash Confirm</div>
      <div class="of-chip" onclick="filterOrders('new',this)">New</div>
      <div class="of-chip" onclick="filterOrders('preparing',this)">Preparing</div>
      <div class="of-chip" onclick="filterOrders('ready',this)">Ready</div>
      <div class="of-chip" onclick="filterOrders('done',this)">Done</div>
    </div>

    <div id="order-list"></div>
  </div>

  <!-- STOCK PAGE -->
  <div class="page" id="page-stock">
    <div class="greeting-block">
      <div class="greeting-name" style="font-size:22px">Stock & Supply</div>
      <div class="greeting-sub">Current delivery cycle · Colombo 03</div>
    </div>
    <div class="alert-banner ab-amber"><div class="ab-icon">⚠️</div><div class="ab-text">Cup lids at 38% — expected to run out in 3 days at current usage. Request top-up now.</div></div>
    <div class="card">
      <div class="card-head"><div class="card-title">Stock Levels</div><div class="card-sub">Updated 2h ago</div></div>
      <div class="card-body" style="padding:4px 16px">
        <div class="stock-item"><div class="stock-emoji">🫘</div><div style="flex:1"><div class="stock-name">Coffee Beans</div><div class="stock-sub">1.2 kg remaining</div></div><div class="stock-bar-wrap"><div class="sbar"><div class="sbar-fill sb-green" style="width:72%"></div></div></div><div class="stock-pct pct-green">72%</div></div>
        <div class="stock-item"><div class="stock-emoji">🥛</div><div style="flex:1"><div class="stock-name">Milk</div><div class="stock-sub">6.8 L remaining</div></div><div class="stock-bar-wrap"><div class="sbar"><div class="sbar-fill sb-green" style="width:68%"></div></div></div><div class="stock-pct pct-green">68%</div></div>
        <div class="stock-item"><div class="stock-emoji">🥤</div><div style="flex:1"><div class="stock-name">10oz Cups</div><div class="stock-sub">310 units left</div></div><div class="stock-bar-wrap"><div class="sbar"><div class="sbar-fill sb-amber" style="width:62%"></div></div></div><div class="stock-pct pct-amber">62%</div></div>
        <div class="stock-item"><div class="stock-emoji">🪄</div><div style="flex:1"><div class="stock-name">Cup Lids</div><div class="stock-sub">190 units — LOW</div></div><div class="stock-bar-wrap"><div class="sbar"><div class="sbar-fill sb-amber" style="width:38%"></div></div></div><div class="stock-pct pct-amber">38%</div></div>
        <div class="stock-item"><div class="stock-emoji">🧢</div><div style="flex:1"><div class="stock-name">Cup Sleeves</div><div class="stock-sub">420 units left</div></div><div class="stock-bar-wrap"><div class="sbar"><div class="sbar-fill sb-green" style="width:84%"></div></div></div><div class="stock-pct pct-green">84%</div></div>
        <div class="stock-item"><div class="stock-emoji">💧</div><div style="flex:1"><div class="stock-name">Water</div><div class="stock-sub">14.2 L remaining</div></div><div class="stock-bar-wrap"><div class="sbar"><div class="sbar-fill sb-green" style="width:71%"></div></div></div><div class="stock-pct pct-green">71%</div></div>
        <div class="stock-item"><div class="stock-emoji">⚡</div><div style="flex:1"><div class="stock-name">Electricity</div><div class="stock-sub">8.4 kWh today</div></div><div class="stock-bar-wrap"><div class="sbar"><div class="sbar-fill sb-green" style="width:58%"></div></div></div><div class="stock-pct pct-green">58%</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title">Cycle Summary</div><div class="card-sub">Delivery 1 of 2</div></div>
      <div class="card-body" style="padding:4px 16px">
        <div class="sum-row"><span class="sum-label">Delivery received</span><span class="sum-val">Jun 1, 2024</span></div>
        <div class="sum-row"><span class="sum-label">Next delivery est.</span><span class="sum-val">Jun 14, 2024</span></div>
        <div class="sum-row"><span class="sum-label">Cups used this cycle</span><span class="sum-val">690 units</span></div>
        <div class="sum-row"><span class="sum-label">Stock status</span><span class="sum-val amber">1 item low</span></div>
      </div>
    </div>
    <button class="submit-btn gold" onclick="openStockRequestModal()">Request Stock Top-Up</button>
  </div>

  <!-- MACHINE PAGE -->
  <div class="page" id="page-machine">
    <div class="greeting-block">
      <div class="greeting-name" style="font-size:22px">Machine Care</div>
      <div class="greeting-sub">Jura X10 · Serial: JX10-2302-0047</div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title">Today's Checklist</div><div class="card-sub">3 / 5 done</div></div>
      <div class="card-body" style="padding:4px 16px">
        <div class="check-item" onclick="toggleCheck(this)"><div class="check-box done">✓</div><div class="check-text"><div class="check-title">Morning clean</div><div class="check-sub">Full rinse cycle before first use</div></div><div class="check-time">07:05</div></div>
        <div class="check-item" onclick="toggleCheck(this)"><div class="check-box done">✓</div><div class="check-text"><div class="check-title">Midday clean</div><div class="check-sub">Steam wand + group head wipe</div></div><div class="check-time">12:30</div></div>
        <div class="check-item" onclick="toggleCheck(this)"><div class="check-box done">✓</div><div class="check-text"><div class="check-title">System flush</div><div class="check-sub">Automatic flush completed</div></div><div class="check-time">13:00</div></div>
        <div class="check-item" onclick="toggleCheck(this)"><div class="check-box"></div><div class="check-text"><div class="check-title">Afternoon clean</div><div class="check-sub">Post-peak hour clean</div></div><div class="check-time">—</div></div>
        <div class="check-item" onclick="toggleCheck(this)"><div class="check-box"></div><div class="check-text"><div class="check-title">End-of-day deep clean</div><div class="check-sub">Full backflush + drip tray</div></div><div class="check-time">—</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title">Service Status</div></div>
      <div class="card-body" style="padding:4px 16px">
        <div class="sum-row"><span class="sum-label">Last routine service</span><span class="sum-val">Apr 15, 2024</span></div>
        <div class="sum-row"><span class="sum-label">Next service due</span><span class="sum-val amber">Jul 15, 2024</span></div>
        <div class="sum-row"><span class="sum-label">Days until service</span><span class="sum-val">39 days</span></div>
        <div class="sum-row"><span class="sum-label">Total cleans today</span><span class="sum-val green">3 × ✓</span></div>
        <div class="sum-row"><span class="sum-label">Machine status</span><span class="sum-val green">Operating normally</span></div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title">Log Machine Event</div></div>
      <div class="card-body">
        <div class="form-group"><label class="form-label">Event type</label><select class="form-select"><option>Manual Clean</option><option>System Flush</option><option>Routine Service</option><option>Emergency Service</option><option>Issue Noticed</option></select></div>
        <div class="form-group"><label class="form-label">Notes (optional)</label><textarea class="form-textarea" placeholder="Describe what was done..."></textarea></div>
        <button class="submit-btn" onclick="showToast('Machine event logged ✓','🔧')">Log Event</button>
      </div>
    </div>
    <button class="submit-btn red" style="margin-top:4px" onclick="openIssueModal()">🚨 Report Emergency Issue</button>
  </div>

  <!-- FINANCE PAGE -->
  <div class="page" id="page-finance">
    <div class="greeting-block">
      <div class="greeting-name" style="font-size:22px">Finance</div>
      <div class="greeting-sub">Payments, invoices & rent · Colombo 03</div>
    </div>
    <div class="section-label">Rent status</div>
    <div class="rent-card due-soon">
      <div class="rent-label">Monthly franchise rent</div>
      <div class="rent-amount">LKR 92,000</div>
      <div class="rent-due">Due: June 28, 2024</div>
      <div class="rent-last">Last paid: May 28 ✓</div>
      <div class="rent-countdown"><div class="countdown-num">21</div><div class="countdown-lbl">days left</div></div>
    </div>
    <div class="section-label">Revenue this cycle</div>
    <div class="card">
      <div class="card-body" style="padding:4px 16px">
        <div class="sum-row"><span class="sum-label">Gross revenue</span><span class="sum-val">LKR 284,400</span></div>
        <div class="sum-row"><span class="sum-label">App orders revenue</span><span class="sum-val blue">LKR 156,200</span></div>
        <div class="sum-row"><span class="sum-label">Walk-in revenue</span><span class="sum-val">LKR 128,200</span></div>
        <div class="sum-row"><span class="sum-label">Franchise fee (12%)</span><span class="sum-val red">− LKR 34,128</span></div>
        <div class="sum-row"><span class="sum-label">Net to you</span><span class="sum-val green">LKR 250,272</span></div>
        <div class="sum-row"><span class="sum-label">Outstanding to franchisor</span><span class="sum-val amber">LKR 74,800</span></div>
        <div class="sum-row"><span class="sum-label">Payment status</span><span class="pill pill-green">Paid ✓</span></div>
      </div>
    </div>
    <div class="section-label">Payment methods — today</div>
    <div class="card">
      <div class="card-body" style="padding:4px 16px">
        <div class="sum-row"><span class="sum-label">💳 Card payments</span><div style="text-align:right"><div class="sum-val">LKR 11,340</div><div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">62% · 153 txns</div></div></div>
        <div class="sum-row"><span class="sum-label">💵 Cash</span><div style="text-align:right"><div class="sum-val">LKR 5,120</div><div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">28% · 69 txns</div></div></div>
        <div class="sum-row"><span class="sum-label">📱 QR / Transfer</span><div style="text-align:right"><div class="sum-val">LKR 1,940</div><div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">10% · 25 txns</div></div></div>
      </div>
    </div>
    <div class="section-label">Coupons used today</div>
    <div class="card">
      <div class="card-body" style="padding:4px 16px">
        <div class="coupon-item"><div class="coupon-code">BREW20</div><div class="coupon-desc">20% off any beverage</div><div class="coupon-count">12×</div><div class="coupon-disc">−LKR 1,440</div></div>
        <div class="coupon-item"><div class="coupon-code">FLAT15</div><div class="coupon-desc">LKR 150 off Flat White</div><div class="coupon-count">4×</div><div class="coupon-disc">−LKR 600</div></div>
        <div class="sum-row" style="padding-top:10px;border-top:1px solid var(--border)"><span class="sum-label" style="font-weight:600">Total discounts given</span><span class="sum-val red">−LKR 2,250</span></div>
      </div>
    </div>
  </div>

  <!-- ALERTS PAGE -->
  <div class="page" id="page-alerts">
    <div class="greeting-block">
      <div class="greeting-name" style="font-size:22px">Issues & Alerts</div>
      <div class="greeting-sub">Open items · Colombo 03</div>
    </div>
    <div class="alert-banner ab-amber"><div class="ab-icon">⚠️</div><div class="ab-text">Cup lids at 38% — request top-up before they run out.</div></div>
    <div class="section-label">Open issues</div>
    <div class="card">
      <div class="card-body" style="padding:4px 16px">
        <div class="complaint-item"><div class="comp-header"><span class="sev-pill sp-med">Medium</span><span class="comp-time">Yesterday</span></div><div class="comp-text">Steam wand pressure seems lower than usual. Requested service check.</div><div class="comp-status">Status: Submitted → Under review by franchisor</div></div>
      </div>
    </div>
    <div class="section-label">Waste logged today</div>
    <div class="card">
      <div class="card-body" style="padding:4px 16px">
        <div class="waste-item"><span class="waste-cat wc-spilled">Spilled</span><div class="waste-name">Milk — small spill</div><div class="waste-qty">0.2 L</div><div class="waste-cost">−LKR 24</div></div>
        <div class="waste-item"><span class="waste-cat wc-disposed">Disposed</span><div class="waste-name">Cups — dropped (damaged)</div><div class="waste-qty">3 units</div><div class="waste-cost">−LKR 45</div></div>
        <div class="sum-row" style="border-top:1px solid var(--border);padding-top:10px"><span class="sum-label">Total waste cost today</span><span class="sum-val red">−LKR 69</span></div>
      </div>
    </div>
    <button class="submit-btn gold" onclick="openIssueModal()">+ Report New Issue</button>
    <button class="submit-btn" style="margin-top:10px;background:var(--brown3)" onclick="openWasteModal()">+ Log Waste</button>
  </div>

  <!-- STATS PAGE -->
  <div class="page" id="page-stats">
    <div class="greeting-block">
      <div class="greeting-name" style="font-size:22px">My Performance</div>
      <div class="greeting-sub">Colombo 03 · June 2024</div>
    </div>
    <div class="ai-tip">
      <div class="ai-tip-icon">◎</div>
      <div>
        <div class="ai-tip-label">AI Monthly Summary</div>
        <div class="ai-tip-text">Trending +11% above last month. 55% of your revenue now comes through the customer app. Machine compliance 100% — best in network this week.</div>
      </div>
    </div>
    <div class="section-label">This month</div>
    <div class="card">
      <div class="card-body" style="padding:4px 16px">
        <div class="sum-row"><span class="sum-label">Total cups sold</span><span class="sum-val">4,218</span></div>
        <div class="sum-row"><span class="sum-label">Gross revenue</span><span class="sum-val">LKR 284,400</span></div>
        <div class="sum-row"><span class="sum-label">App orders</span><span class="sum-val blue">1,842 orders</span></div>
        <div class="sum-row"><span class="sum-label">Average daily cups</span><span class="sum-val">281</span></div>
        <div class="sum-row"><span class="sum-label">Machine compliant days</span><span class="sum-val green">7 / 7 ✓</span></div>
        <div class="sum-row"><span class="sum-label">Coupons redeemed</span><span class="sum-val">89 uses</span></div>
      </div>
    </div>
    <div class="section-label">Network ranking</div>
    <div class="card">
      <div class="card-body" style="padding:4px 16px">
        <div class="sum-row"><span class="sum-label">Revenue rank</span><span class="sum-val" style="color:var(--gold)">🥈 #2 of 6</span></div>
        <div class="sum-row"><span class="sum-label">App orders rank</span><span class="sum-val" style="color:var(--gold)">🥇 #1 of 6</span></div>
        <div class="sum-row"><span class="sum-label">Machine compliance</span><span class="sum-val green">🥇 #1 of 6</span></div>
        <div style="padding:10px 0 4px;font-size:12px;color:var(--text3);font-family:var(--font-mono);border-top:1px solid var(--border);margin-top:4px">Rankings are anonymous</div>
      </div>
    </div>
  </div>

</div><!-- /content -->

<!-- BOTTOM NAV -->
<div class="bottom-nav">
  <div class="nav-tab" onclick="navigate('home',this)" id="bnav-home">
    <div class="nav-icon">⌂</div><div class="nav-label">Home</div>
  </div>
  <div class="nav-tab" onclick="navigate('orders',this)" id="bnav-orders">
    <div class="nav-icon">⚡</div><div class="nav-label">Orders</div>
    <div class="nav-badge green-badge pulse" id="orders-badge">4</div>
  </div>
  <div class="nav-tab" onclick="navigate('stock',this)" id="bnav-stock">
    <div class="nav-icon">▦</div><div class="nav-label">Stock</div>
    <div class="nav-badge">1</div>
  </div>
  <div class="nav-tab" onclick="navigate('machine',this)" id="bnav-machine">
    <div class="nav-icon">⊞</div><div class="nav-label">Machine</div>
  </div>
  <div class="nav-tab" onclick="navigate('finance',this)" id="bnav-finance">
    <div class="nav-icon">◇</div><div class="nav-label">Finance</div>
  </div>
  <div class="nav-tab" onclick="navigate('stats',this)" id="bnav-stats">
    <div class="nav-icon">◉</div><div class="nav-label">Stats</div>
  </div>
</div>

<!-- MODALS -->
<div class="modal-overlay" id="modal-sale">
  <div class="modal-sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-head"><div class="sheet-title">Log Walk-in Sale</div><div class="sheet-close" onclick="closeModal('modal-sale')">×</div></div>
    <div class="sheet-body">
      <div class="form-group"><label class="form-label">Beverage</label>
        <div class="bev-picker">
          <div class="bev-pick-btn selected" onclick="pickBev(this)"><div class="bicon">☕</div><div class="bname">Flat White</div></div>
          <div class="bev-pick-btn" onclick="pickBev(this)"><div class="bicon">🍵</div><div class="bname">Latte</div></div>
          <div class="bev-pick-btn" onclick="pickBev(this)"><div class="bicon">⚡</div><div class="bname">Espresso</div></div>
          <div class="bev-pick-btn" onclick="pickBev(this)"><div class="bicon">🫧</div><div class="bname">Cappuccino</div></div>
          <div class="bev-pick-btn" onclick="pickBev(this)"><div class="bicon">🧊</div><div class="bname">Iced Latte</div></div>
          <div class="bev-pick-btn" onclick="pickBev(this)"><div class="bicon">🧋</div><div class="bname">Cold Brew</div></div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Quantity</label>
        <div class="stepper"><button class="step-btn" onclick="stepQty(-1)">−</button><div class="step-val" id="qty-val">1</div><button class="step-btn" onclick="stepQty(1)">+</button></div>
      </div>
      <div class="form-group"><label class="form-label">Payment method</label>
        <div class="method-picker">
          <div class="method-btn selected" onclick="pickMethod(this)">💳 Card</div>
          <div class="method-btn" onclick="pickMethod(this)">💵 Cash</div>
          <div class="method-btn" onclick="pickMethod(this)">📱 QR</div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Coupon code (optional)</label><input type="text" class="form-input" placeholder="e.g. BREW20" style="text-transform:uppercase"></div>
      <div class="form-group"><label class="form-label">Price (LKR)</label><input type="number" class="form-input" value="700"></div>
      <button class="submit-btn gold" onclick="submitSale()">Record Sale</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="modal-machine">
  <div class="modal-sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-head"><div class="sheet-title">Machine Event</div><div class="sheet-close" onclick="closeModal('modal-machine')">×</div></div>
    <div class="sheet-body">
      <div class="form-group"><label class="form-label">Event type</label><select class="form-select"><option>Manual Clean</option><option>System Flush</option><option>Routine Service Completed</option><option>Emergency Service</option><option>Issue Noticed</option></select></div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" placeholder="What was done? Any observations?"></textarea></div>
      <button class="submit-btn" onclick="closeModal('modal-machine');showToast('Machine event logged ✓','🔧')">Log Event</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="modal-waste">
  <div class="modal-sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-head"><div class="sheet-title">Log Waste</div><div class="sheet-close" onclick="closeModal('modal-waste')">×</div></div>
    <div class="sheet-body">
      <div class="form-group"><label class="form-label">Item type</label><select class="form-select"><option>Coffee Beans</option><option>Milk</option><option>10oz Cups</option><option>Cup Lids</option><option>Cup Sleeves</option><option>Other</option></select></div>
      <div class="form-group"><label class="form-label">Reason</label><select class="form-select"><option>Spilled / Accident</option><option>Disposed (damaged)</option><option>Expired / End of day</option><option>Quality issue</option></select></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Quantity</label><input type="text" class="form-input" placeholder="e.g. 0.5 L"></div>
        <div class="form-group"><label class="form-label">Est. cost (LKR)</label><input type="number" class="form-input" placeholder="0"></div>
      </div>
      <button class="submit-btn red" onclick="closeModal('modal-waste');showToast('Waste logged ✓','🗑️')">Log Waste Item</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="modal-issue">
  <div class="modal-sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-head"><div class="sheet-title">Report Issue</div><div class="sheet-close" onclick="closeModal('modal-issue')">×</div></div>
    <div class="sheet-body">
      <div class="form-group"><label class="form-label">Issue category</label><select class="form-select"><option>Machine — Emergency</option><option>Machine — Routine concern</option><option>Stock / Supply</option><option>Packaging quality</option><option>Customer complaint</option><option>Suggestion / Improvement</option><option>Other</option></select></div>
      <div class="form-group"><label class="form-label">Severity</label>
        <div class="method-picker">
          <div class="method-btn selected" onclick="pickMethod(this)" style="background:var(--red-light);border-color:var(--red);color:var(--red)">🔴 High</div>
          <div class="method-btn" onclick="pickMethod(this)">🟡 Medium</div>
          <div class="method-btn" onclick="pickMethod(this)">🟢 Low</div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" placeholder="Describe the issue in detail..."></textarea></div>
      <button class="submit-btn red" onclick="closeModal('modal-issue');showToast('Issue reported to franchisor ✓','⚠️')">Submit Issue</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="modal-stock-req">
  <div class="modal-sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-head"><div class="sheet-title">Request Stock Top-Up</div><div class="sheet-close" onclick="closeModal('modal-stock-req')">×</div></div>
    <div class="sheet-body">
      <div class="form-group"><label class="form-label">Items needed</label>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <label style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text2)"><input type="checkbox" checked style="width:16px;height:16px;accent-color:var(--gold)"> Cup Lids — urgent</label>
          <label style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text2)"><input type="checkbox" style="width:16px;height:16px;accent-color:var(--gold)"> Coffee Beans</label>
          <label style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text2)"><input type="checkbox" style="width:16px;height:16px;accent-color:var(--gold)"> Milk</label>
          <label style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text2)"><input type="checkbox" style="width:16px;height:16px;accent-color:var(--gold)"> 10oz Cups</label>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Urgency</label><select class="form-select"><option>Today — critical</option><option>Within 2 days</option><option>Next delivery</option></select></div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" placeholder="Any specific quantities..."></textarea></div>
      <button class="submit-btn gold" onclick="closeModal('modal-stock-req');showToast('Stock request sent to franchisor ✓','📦')">Send Request</button>
    </div>
  </div>
</div>

<!-- TOAST -->
<div class="toast" id="toast"><span id="toast-icon"></span><span id="toast-msg"></span></div>

<script>
// ══ SUPABASE CONFIG ══
// Replace with your values from supabase.com → Settings → API
const SUPABASE_URL = 'https://fjmzsxslnzrtgcilttly.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqbXpzeHNsbnpydGdjaWx0dGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMjU4OTksImV4cCI6MjA5NjkwMTg5OX0.F56god4wqLUCgP1lCVTLZCK9aII4Vo_4g4fJcPAFfFc';
let OUTLET_ID = null; // set after login from the franchisee's profile

let sb = null;

async function initSupabase() {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✓ Supabase connected');

    // Check for an existing logged-in session first
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      await loadProfileAndEnterApp(session.user.id);
    } else {
      document.getElementById('auth-gate').style.display = 'flex';
    }
  } catch(e) {
    console.error('Supabase connection failed:', e.message);
    document.getElementById('auth-error').textContent = 'Cannot connect — check your internet connection.';
    document.getElementById('auth-error').style.display = 'block';
  }
}

// ── Load the logged-in franchisee's profile, then unlock the app ──
async function loadProfileAndEnterApp(userId) {
  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error || !profile) {
    showAuthError('Could not load your profile. Please contact your franchisor.');
    await sb.auth.signOut();
    return;
  }
  if (profile.role !== 'franchisee') {
    showAuthError('This account is not registered as a franchisee.');
    await sb.auth.signOut();
    return;
  }
  if (!profile.outlet_id) {
    showAuthError('Your account has no outlet assigned. Contact your franchisor.');
    await sb.auth.signOut();
    return;
  }

  OUTLET_ID = profile.outlet_id;
  window.MY_PROFILE = profile;

  // Update greeting with real name
  const nameEl = document.querySelector('.greeting-name em');
  if (nameEl && profile.full_name) nameEl.textContent = profile.full_name.split(' ')[0] + '.';

  document.getElementById('auth-gate').style.display = 'none';
  await loadFranchiseeData();
  subscribeToOrders();
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('auth-form-login').style.display = isLogin ? 'block' : 'none';
  document.getElementById('auth-form-signup').style.display = isLogin ? 'none' : 'block';
  document.getElementById('auth-tab-login').style.background = isLogin ? 'var(--brand,#8B1A1A)' : 'transparent';
  document.getElementById('auth-tab-login').style.color = isLogin ? 'white' : 'var(--text2,#4a3420)';
  document.getElementById('auth-tab-signup').style.background = isLogin ? 'transparent' : 'var(--brand,#8B1A1A)';
  document.getElementById('auth-tab-signup').style.color = isLogin ? 'var(--text2,#4a3420)' : 'white';
  document.getElementById('auth-error').style.display = 'none';
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showAuthError('Please enter email and password.'); return; }

  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = 'Logging in...';

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = 'Log In';

  if (error) { showAuthError(error.message); return; }
  await loadProfileAndEnterApp(data.user.id);
}

async function doSignup() {
  const full_name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const invite_code = document.getElementById('signup-invite').value.trim().toUpperCase();

  if (!full_name || !email || !password || !invite_code) {
    showAuthError('Please fill in all fields.'); return;
  }
  if (password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }

  const btn = document.getElementById('signup-btn');
  btn.disabled = true; btn.textContent = 'Validating invite code...';

  // Validate the invite code BEFORE creating the account
  const { data: invite, error: inviteErr } = await sb.from('invite_codes')
    .select('*').eq('code', invite_code).eq('role', 'franchisee').maybeSingle();

  if (inviteErr || !invite) {
    btn.disabled = false; btn.textContent = 'Create Account';
    showAuthError('Invalid invite code.'); return;
  }
  if (invite.used_by) {
    btn.disabled = false; btn.textContent = 'Create Account';
    showAuthError('This invite code has already been used.'); return;
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    btn.disabled = false; btn.textContent = 'Create Account';
    showAuthError('This invite code has expired.'); return;
  }

  btn.textContent = 'Creating account...';
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { role: 'franchisee', full_name, outlet_id: invite.outlet_id } }
  });

  if (error) {
    btn.disabled = false; btn.textContent = 'Create Account';
    showAuthError(error.message); return;
  }
  if (!data.session) {
    btn.disabled = false; btn.textContent = 'Create Account';
    showAuthError('Account created! Check your email to confirm, then log in.');
    switchAuthTab('login');
    return;
  }

  // Create the profile row directly (the DB trigger can't run on
  // Supabase-managed auth.users, so we do this client-side instead)
  const { error: profileErr } = await sb.from('profiles').upsert({
    id: data.user.id, role: 'franchisee', full_name, outlet_id: invite.outlet_id, phone: null
  });
  if (profileErr) {
    btn.disabled = false; btn.textContent = 'Create Account';
    showAuthError('Account created but profile setup failed: ' + profileErr.message);
    return;
  }

  await sb.from('invite_codes').update({ used_by: data.user.id, used_at: new Date().toISOString() })
    .eq('code', invite_code).is('used_by', null);

  btn.disabled = false; btn.textContent = 'Create Account';
  await loadProfileAndEnterApp(data.user.id);
}

async function loadFranchiseeData() {
  try {
    // Load today's ops
    const today = new Date().toISOString().split('T')[0];
    const [opsRes, ordersRes, stockRes, machineRes, rentRes, issuesRes] = await Promise.all([
      sb.from('daily_ops').select('*').eq('outlet_id', OUTLET_ID).eq('date', today).maybeSingle(),
      sb.from('orders').select('*, order_items(*)').eq('outlet_id', OUTLET_ID)
        .not('status','eq','completed').not('status','eq','cancelled').order('created_at'),
      sb.from('stock').select('*').eq('outlet_id', OUTLET_ID),
      sb.from('machines').select('*').eq('outlet_id', OUTLET_ID).maybeSingle(),
      sb.from('rent_schedules').select('*').eq('outlet_id', OUTLET_ID).maybeSingle(),
      sb.from('issues').select('id').eq('outlet_id', OUTLET_ID).eq('status','open')
    ]);

    // Update hero stats from DB (always runs — shows real zeros when empty)
    const ops = opsRes.data || { total_cups: 0, total_revenue: 0, machine_cleans: 0, machine_flushes: 0 };
    document.querySelector('.hero-cups').innerHTML = `${ops.total_cups} <span>cups</span>`;
    document.querySelector('.hero-revenue').textContent = `LKR ${(ops.total_revenue/100).toLocaleString()}`;
    const heroStatVals = document.querySelectorAll('.hero-stat-val');
    if (heroStatVals[0]) heroStatVals[0].textContent = ops.total_cups > 0 ? `LKR ${Math.round(ops.total_revenue/ops.total_cups/100)}` : 'LKR 0';
    if (heroStatVals[1]) heroStatVals[1].textContent = ops.machine_cleans || 0;
    if (heroStatVals[2]) heroStatVals[2].textContent = ops.machine_flushes || 0;

    // Load live orders
    if (ordersRes.data) {
      window.LIVE_ORDERS = ordersRes.data.map(o => ({
        id: o.id,
        order_number: o.order_number,
        outlet: o.outlet_id,
        items: (o.order_items||[]).map(i => ({
          emoji: i.emoji||'☕',
          name: i.name,
          detail: [i.size,i.temperature,i.milk].filter(Boolean).join(' / '),
          qty: i.quantity,
          price: Math.round(i.line_total/100)
        })),
        payment: o.payment_method,
        total: Math.round(o.total/100),
        status: o.payment_method==='cash'&&(o.status==='pending'||o.payment_status==='pending') ? 'cash' : (o.status==='pending'||o.status==='confirmed') ? 'new' : o.status,
        time: new Date(o.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
        mode: o.order_type==='pickup' ? 'Pickup' : 'Delivery',
        isCash: o.payment_method==='cash' && o.payment_status==='pending'
      }));
      renderOrders('all');
      updateOrderCount();
    }

    // Update stock display from DB
    if (stockRes.data) {
      updateStockDisplay(stockRes.data);
    }

    // Update machine status
    if (machineRes.data) {
      updateMachineDisplay(machineRes.data);
    }

    // ── Update status strip (machine / stock / orders / rent / issues) ──
    updateStatusStrip({
      machine: machineRes.data,
      stock: stockRes.data || [],
      liveOrderCount: (ordersRes.data || []).length,
      rent: rentRes.data,
      openIssueCount: (issuesRes.data || []).length
    });

  } catch(e) {
    console.error('loadFranchiseeData error:', e?.message || e);
  }
}

// ── Build the status strip + AI insight from real data (replaces hardcoded demo text) ──
function updateStatusStrip({ machine, stock, liveOrderCount, rent, openIssueCount }) {
  const strip = document.querySelector('.status-strip');
  if (!strip) return;

  const chips = [];

  // Machine
  if (machine) {
    const map = { ok:['sc-green','Machine OK'], due_soon:['sc-amber','Service due soon'],
                  overdue:['sc-red','Machine overdue'], emergency:['sc-red','Machine emergency'] };
    const [cls, label] = map[machine.status] || ['sc-green','Machine OK'];
    chips.push(`<div class="status-chip ${cls}"><div class="dot sc-dot-${cls.split('-')[1]}"></div>${label}</div>`);
  } else {
    chips.push(`<div class="status-chip"><div class="dot"></div>No machine on file</div>`);
  }

  // Lowest stock item (most urgent)
  if (stock.length) {
    const lowest = stock.reduce((min, s) => (s.current_qty/s.max_qty) < (min.current_qty/min.max_qty) ? s : min);
    const pct = Math.round((lowest.current_qty / lowest.max_qty) * 100);
    const cls = pct < 25 ? 'sc-red' : pct < 50 ? 'sc-amber' : 'sc-green';
    chips.push(`<div class="status-chip ${cls}"><div class="dot sc-dot-${cls.split('-')[1]}"></div>${lowest.item_name} ${pct}%</div>`);
  } else {
    chips.push(`<div class="status-chip"><div class="dot"></div>No stock tracked</div>`);
  }

  // Live orders
  chips.push(`<div class="status-chip sc-blue"><div class="dot sc-dot-blue"></div>${liveOrderCount} live order${liveOrderCount===1?'':'s'}</div>`);

  // Rent
  if (rent) {
    const map = { current:'sc-green', due_soon:'sc-amber', overdue:'sc-red' };
    const cls = map[rent.status] || 'sc-green';
    const daysLeft = rent.next_due_at ? Math.max(0, Math.ceil((new Date(rent.next_due_at) - new Date()) / 86400000)) : null;
    chips.push(`<div class="status-chip ${cls}"><div class="dot sc-dot-${cls.split('-')[1]}"></div>Rent ${rent.status==='current'?'OK':rent.status.replace('_',' ')}${daysLeft!==null?' — '+daysLeft+'d':''}</div>`);
  } else {
    chips.push(`<div class="status-chip"><div class="dot"></div>No rent schedule</div>`);
  }

  // Open issues
  if (openIssueCount > 0) {
    chips.push(`<div class="status-chip sc-red"><div class="dot sc-dot-red"></div>${openIssueCount} open issue${openIssueCount===1?'':'s'}</div>`);
  } else {
    chips.push(`<div class="status-chip sc-green"><div class="dot sc-dot-green"></div>No open issues</div>`);
  }

  strip.innerHTML = chips.join('');

  // AI insight box — simple real-data summary (replaces hardcoded narrative)
  const tipEl = document.querySelector('.ai-tip-text');
  if (tipEl) {
    if (liveOrderCount === 0 && openIssueCount === 0) {
      tipEl.textContent = 'All quiet right now — no live orders or open issues. Check back as orders come in.';
    } else {
      const parts = [];
      if (liveOrderCount > 0) parts.push(`${liveOrderCount} active order${liveOrderCount===1?'':'s'} from the customer app`);
      if (openIssueCount > 0) parts.push(`${openIssueCount} open issue${openIssueCount===1?'':'s'} need attention`);
      tipEl.textContent = parts.join('. ') + '.';
    }
  }
}

function subscribeToOrders() {
  if (!sb) return;
  sb.channel('franchisee-orders-' + OUTLET_ID)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'orders',
      filter: `outlet_id=eq.${OUTLET_ID}`
    }, async payload => {
      const order = payload.new;
      // Client-side outlet filter (server-side filter needs REPLICA IDENTITY FULL)
      if (order.outlet_id !== OUTLET_ID) return;
      // Fetch order items
      const { data: items } = await sb.from('order_items').select('*').eq('order_id', order.id);
      const newOrder = {
        id: order.id,
        order_number: order.order_number,
        items: (items||[]).map(i => ({
          emoji: i.emoji||'☕', name: i.name,
          detail: [i.size,i.temperature,i.milk].filter(Boolean).join(' / '),
          qty: i.quantity, price: Math.round(i.line_total/100)
        })),
        payment: order.payment_method,
        total: Math.round(order.total/100),
        status: order.payment_method==='cash' ? 'cash' : 'new',
        time: new Date(order.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
        mode: order.order_type==='pickup' ? 'Pickup' : 'Delivery',
        isCash: order.payment_method==='cash'
      };
      // Add to top of orders list
      window.LIVE_ORDERS = [newOrder, ...(window.LIVE_ORDERS||[])];
      renderOrders('all');
      updateOrderCount();
      // Show popup notification
      showNewOrderPopup(newOrder);
      // Show cash banner if cash payment
      if (newOrder.isCash) showCashPopup(newOrder);
      // Update nav badge
      const badge = document.getElementById('orders-badge');
      if (badge) { badge.textContent = parseInt(badge.textContent||0)+1; }
    })
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'orders',
      filter: `outlet_id=eq.${OUTLET_ID}`
    }, () => loadFranchiseeData())
    .subscribe();
}

// Update order status in Supabase
async function updateOrderStatusDB(orderId, newStatus) {
  if (!sb || !orderId || orderId.length < 10) return; // skip for static/demo IDs
  const updates = { status: newStatus };
  if (newStatus === 'preparing' || (newStatus === 'confirmed')) updates.status = 'preparing';
  if (newStatus === 'ready') updates.status = 'ready';
  if (newStatus === 'done') updates.status = 'completed';
  await sb.from('orders').update(updates).eq('id', orderId);
}

// Save machine log to Supabase
async function saveMachineLog(eventType, notes) {
  if (!sb) return;
  await sb.from('machine_logs').insert({
    outlet_id: OUTLET_ID,
    event_type: eventType,
    notes: notes || null
  });
}

// Save stock request to Supabase
async function saveStockRequest(items, urgency, notes) {
  if (!sb) return;
  await sb.from('stock_requests').insert({
    outlet_id: OUTLET_ID,
    items: items,
    urgency: urgency || 'normal',
    notes: notes || null
  });
}

// Save waste log to Supabase
async function saveWasteLog(itemName, reason, quantity, cost) {
  if (!sb) return;
  await sb.from('waste_logs').insert({
    outlet_id: OUTLET_ID,
    item_name: itemName,
    reason: reason,
    quantity: quantity,
    estimated_cost: cost ? cost * 100 : null
  });
}

// Save issue to Supabase
async function saveIssue(category, severity, description) {
  if (!sb) return;
  await sb.from('issues').insert({
    outlet_id: OUTLET_ID,
    category: category,
    severity: severity,
    description: description
  });
}

// Update stock display
function updateStockDisplay(stockData) {
  const stockItems = document.querySelectorAll('.stock-item');
  stockItems.forEach(el => {
    const nameEl = el.querySelector('.stock-name');
    if (!nameEl) return;
    const name = nameEl.textContent.trim();
    const dbItem = stockData.find(s => s.item_name === name);
    if (!dbItem) {
      // No stock record yet for this item — show a real empty state, not the demo numbers
      const pctEl = el.querySelector('.stock-pct');
      const bar = el.querySelector('.sbar-fill');
      const subEl = el.querySelector('.stock-sub');
      if (pctEl) { pctEl.textContent = '—'; pctEl.className = 'stock-pct'; }
      if (subEl) subEl.textContent = 'Not tracked yet';
      if (bar) { bar.style.width = '0%'; bar.className = 'sbar-fill'; }
      return;
    }
    const pct = Math.round((dbItem.current_qty / dbItem.max_qty) * 100);
    const pctEl = el.querySelector('.stock-pct');
    const bar = el.querySelector('.sbar-fill');
    const subEl = el.querySelector('.stock-sub');
    if (pctEl) pctEl.textContent = pct + '%';
    if (subEl) subEl.textContent = `${dbItem.current_qty} ${dbItem.unit} remaining`;
    if (bar) {
      bar.style.width = pct + '%';
      bar.className = 'sbar-fill ' + (pct < 25 ? 'sb-red' : pct < 50 ? 'sb-amber' : 'sb-green');
    }
    if (pctEl) {
      pctEl.className = 'stock-pct ' + (pct < 25 ? 'pct-red' : pct < 50 ? 'pct-amber' : 'pct-green');
    }
  });
}

// Update machine display
function updateMachineDisplay(machine) {
  const dueEl = document.querySelector('[data-machine-due]');
  if (dueEl && machine.next_service_due) dueEl.textContent = machine.next_service_due;
}

// Use window.LIVE_ORDERS as primary, fall back to static ORDERS
function getOrders() {
  return window.LIVE_ORDERS || [];
}

// ── GREETING ──
(function(){
  const d=new Date();
  const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('greeting-time').textContent=days[d.getDay()]+' · '+d.getDate()+' '+months[d.getMonth()]+' '+d.getFullYear();
})();

// ── NAVIGATION ──
const navMap={home:'bnav-home',orders:'bnav-orders',stock:'bnav-stock',machine:'bnav-machine',finance:'bnav-finance',alerts:null,stats:'bnav-stats'};
function navigate(id,tabEl){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pg=document.getElementById('page-'+id);
  if(pg) pg.classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  if(tabEl) tabEl.classList.add('active');
  else if(navMap[id]){const el=document.getElementById(navMap[id]);if(el)el.classList.add('active');}
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='orders') renderOrders('all');
}


function renderOrders(filter){
  const el=document.getElementById('order-list');
  if(!el) return;
  const allOrders = getOrders();
  let list=allOrders;
  if(filter==='cash') list=allOrders.filter(o=>o.status==='cash'||o.isCash);
  else if(filter==='new') list=allOrders.filter(o=>o.status==='new');
  else if(filter==='preparing') list=allOrders.filter(o=>o.status==='preparing');
  else if(filter==='ready') list=allOrders.filter(o=>o.status==='ready');
  else if(filter==='done') list=allOrders.filter(o=>o.status==='done');
  if(list.length===0){el.innerHTML=`<div style="text-align:center;padding:40px 20px;color:var(--text3);font-family:var(--font-mono);font-size:13px;">No ${filter==='all'?'active':filter} orders right now ☕</div>`;return;}

  const statusLabels={new:'🆕 New',cash:'💵 Cash',preparing:'⏳ Preparing',ready:'✅ Ready',done:'Done'};
  const statusClasses={new:'ls-new',cash:'ls-cash',preparing:'ls-prep',ready:'ls-ready',done:'ls-done'};
  const cardClasses={new:' new-order',cash:' cash-pending',ready:' ready-to-serve',done:'',preparing:''};

  el.innerHTML=list.map(o=>`
    <div class="live-order-item${cardClasses[o.status]||''}">
      <div class="loi-head">
        <div class="loi-num">${o.id}</div>
        <div class="loi-mode ${o.mode==='Pickup'?'lm-pickup':'lm-delivery'}">${o.mode}</div>
        <div class="loi-time">${o.time}</div>
        <div class="loi-status ${statusClasses[o.status]||'ls-done'}">${statusLabels[o.status]||o.status}</div>
      </div>
      ${o.isCash?`<div class="cash-alert-bar">💵 Customer chose cash payment — confirm LKR ${o.total.toLocaleString()} received in hand</div>`:''}
      <div class="loi-body">
        ${o.items.map(i=>`<div class="loi-item-row">
          <div class="loi-emoji">${i.emoji||'☕'}</div>
          <div style="flex:1">
            <div class="loi-item-name">${i.name}</div>
            <div class="loi-item-detail">${i.detail}</div>
          </div>
          <div class="loi-item-qty">×${i.qty}</div>
          <div class="loi-item-price">LKR ${i.price.toLocaleString()}</div>
        </div>`).join('')}
      </div>
      <div class="loi-foot">
        <div class="loi-payment lp-${o.payment}">${o.payment==='card'?'💳 Card':o.payment==='cash'?'💵 Cash':'📱 QR'}</div>
        <div class="loi-total">LKR ${o.total.toLocaleString()}</div>
        ${o.status==='new'?`<button class="loi-action la-confirm" onclick="updateOrder('${o.id}','preparing')">Start Preparing</button>`:
          o.status==='cash'?`<button class="loi-action la-cash" onclick="confirmOrderCash('${o.id}')">✓ Cash Received</button>`:
          o.status==='preparing'?`<button class="loi-action la-ready" onclick="updateOrder('${o.id}','ready')">Mark Ready</button>`:
          o.status==='ready'?`<button class="loi-action la-done" onclick="updateOrder('${o.id}','done')">Complete</button>`:
          `<button class="loi-action la-done" disabled>Completed</button>`}
      </div>
    </div>`).join('');
}

function updateOrder(id,newStatus){
  const orders=getOrders();
  const o=orders.find(x=>x.id===id);
  if(!o) return;
  o.status=newStatus;o.isCash=false;
  const msgs={preparing:'Now preparing — customer notified',ready:'Ready! Customer notified to collect',done:'Order completed ✓'};
  showToast(msgs[newStatus]||'Order updated','✓');
  updateOrderStatusDB(id,newStatus);
  renderOrders('all');
  updateOrderCount();
}

function confirmOrderCash(id){
  const orders=getOrders();
  const o=orders.find(x=>x.id===id);
  if(!o) return;
  o.status='preparing';o.isCash=false;
  showToast('Cash confirmed — start preparing order','💵');
  updateOrderStatusDB(id,'preparing');
  dismissCash();
  renderOrders('all');
  updateOrderCount();
}

function filterOrders(f,btn){
  document.querySelectorAll('.of-chip').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderOrders(f);
}

function updateOrderCount(){
  const active=getOrders().filter(o=>o.status!=='done').length;
  document.getElementById('orders-badge').textContent=active;
  document.getElementById('orders-quick-badge').textContent=active;
  const heroEl=document.getElementById('live-order-hero');
  if(heroEl) heroEl.textContent=active;
}

// ── CASH CONFIRM POPUP ──
function showCashPopup(order){
  document.getElementById('ccp-title').textContent='Cash Payment — '+order.id;
  document.getElementById('ccp-sub').textContent=order.items[0].name+(order.items.length>1?` +${order.items.length-1} more`:'')+' · LKR '+order.total.toLocaleString()+' · Confirm received?';
  document.getElementById('cash-confirm-popup').classList.add('show');
}
function confirmCash(){
  const cashOrder=getOrders().find(o=>o.status==='cash');
  if(cashOrder) confirmOrderCash(cashOrder.id);
  else dismissCash();
}
function dismissCash(){document.getElementById('cash-confirm-popup').classList.remove('show');}

// ── NEW ORDER POPUP ──
function showNewOrderPopup(order){
  document.getElementById('nop-title').textContent=order.items.map(i=>i.name+' ×'+i.qty).join(' + ');
  document.getElementById('nop-sub').textContent=(order.payment==='card'?'Card':'Cash')+' payment · LKR '+order.total.toLocaleString()+' · '+order.mode;
  const pop=document.getElementById('new-order-popup');
  pop.classList.add('show');
  setTimeout(()=>pop.classList.remove('show'),6000);
}
function goToOrders(){
  document.getElementById('new-order-popup').classList.remove('show');
  navigate('orders');
  const tab=document.getElementById('bnav-orders');
  if(tab){document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');}
}

// ── MODALS ──
function openSaleModal(){document.getElementById('modal-sale').classList.add('open');}
function openMachineModal(){document.getElementById('modal-machine').classList.add('open');}
function openWasteModal(){document.getElementById('modal-waste').classList.add('open');}
function openIssueModal(){document.getElementById('modal-issue').classList.add('open');}
function openStockRequestModal(){document.getElementById('modal-stock-req').classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(o=>{o.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});});

// ── FORM HELPERS ──
let qty=1;
function stepQty(d){qty=Math.max(1,qty+d);document.getElementById('qty-val').textContent=qty;}
function pickBev(el){el.closest('.bev-picker').querySelectorAll('.bev-pick-btn').forEach(b=>b.classList.remove('selected'));el.classList.add('selected');}
function pickMethod(el){el.closest('.method-picker').querySelectorAll('.method-btn').forEach(b=>b.classList.remove('selected'));el.classList.add('selected');}
function toggleCheck(el){const b=el.querySelector('.check-box'),t=el.querySelector('.check-time');if(b.classList.contains('done')){b.classList.remove('done');b.textContent='';t.textContent='—';}else{b.classList.add('done');b.textContent='✓';const n=new Date();t.textContent=n.getHours().toString().padStart(2,'0')+':'+n.getMinutes().toString().padStart(2,'0');showToast('Logged ✓','🔧');}}
function submitSale(){closeModal('modal-sale');showToast('Walk-in sale recorded ✓','☕');qty=1;document.getElementById('qty-val').textContent='1';}

// ── TOAST ──
let toastT;
function showToast(msg,icon){const t=document.getElementById('toast');document.getElementById('toast-msg').textContent=msg;document.getElementById('toast-icon').textContent=icon||'✓';t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),3000);}






// Initial render
renderOrders('all');
updateOrderCount();

// Connect to Supabase
initSupabase();
</script>
</body>
</html>

/* W07 · quiet single-leaf silhouette. Both seasons share exactly the same alpha mask.
   Classic script/global pack interface is retained for engine.useLeafTex and loadLeaves. */
(function () {
  const TA = window.TA = window.TA || {};
  const S = 256;
  function atlas(autumn) {
    const cv = document.createElement('canvas'); cv.width = cv.height = S;
    const c = cv.getContext('2d');
    c.beginPath(); c.moveTo(S*.47,S*.035);
    c.bezierCurveTo(S*.76,S*.2,S*.92,S*.53,S*.58,S*.91);
    c.quadraticCurveTo(S*.51,S*.98,S*.47,S*.965);
    c.bezierCurveTo(S*.13,S*.69,S*.14,S*.34,S*.47,S*.035);
    c.fillStyle=autumn?'#D9B75F':'#91B480'; c.fill();
    c.save(); c.clip();
    // Very broad translucent washes, no veins, repeated florets or baked white highlights.
    const wash=c.createLinearGradient(0,0,S,S);
    wash.addColorStop(0,'rgba(255,255,239,.025)'); wash.addColorStop(.47,'rgba(255,255,239,.01)'); wash.addColorStop(1,'rgba(37,57,32,.025)');
    c.fillStyle=wash; c.fillRect(0,0,S,S); c.restore();
    return cv.toDataURL('image/png');
  }
  TA.LEAVES = { green: atlas(false), gold: atlas(true) };
})();

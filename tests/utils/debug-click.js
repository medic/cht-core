// Debug-logging click wrapper with automatic retry on transient list-rerender errors.
//
// Background: several of the webapp's list views re-render (detach + re-add DOM nodes)
// whenever their backing docs' _rev changes, because trackBy includes the revision.
// Under CI load (headless + slower CPU) the re-render can happen between a WDIO
// selector lookup and the click syscall, producing either:
//   - "stale element reference" (node detached after lookup, before click)
//   - "element wasn't found" (lookup landed during the brief detached window)
//
// Both are the same underlying race. This helper retries on either, re-resolving
// the element on each attempt via the passed-in `getter`. When it gives up it
// dumps MutationObserver-captured DOM mutations, the watched container's HTML,
// and a screenshot for post-mortem diagnosis.
//
// Remove or simplify once the product-side fix (stable trackBy) lands.
const debugClick = async (getter, label, watchSelector) => {
  if (watchSelector) {
    /* eslint-disable no-undef */
    await browser.execute((sel) => {
      try {
        if (window.__dbgObs) {
          window.__dbgObs.disconnect();
        }
      } catch {
        // noop
      }
      window.__dbgLog = [];
      const root = document.querySelector(sel);
      if (!root) {
        window.__dbgLog.push({ note: 'watch root not found', sel });
        return;
      }
      const desc = (n) => {
        if (!n) {
          return null;
        }
        const cls = n.className && n.className.toString ? n.className.toString().slice(0, 60) : '';
        return `${n.nodeName}${n.id ? '#' + n.id : ''}${cls ? '.' + cls.replace(/\s+/g, '.') : ''}`;
      };
      const obs = new MutationObserver((muts) => {
        const t = Date.now();
        for (const m of muts) {
          window.__dbgLog.push({
            t,
            type: m.type,
            target: desc(m.target),
            attr: m.attributeName || undefined,
            added: Array.from(m.addedNodes).map(desc),
            removed: Array.from(m.removedNodes).map(desc),
          });
        }
        if (window.__dbgLog.length > 500) {
          window.__dbgLog.splice(0, window.__dbgLog.length - 500);
        }
      });
      obs.observe(root, { childList: true, subtree: true, attributes: true, characterData: true });
      window.__dbgObs = obs;
    }, watchSelector);
    /* eslint-enable no-undef */
  }

  const start = Date.now();
  const retryTimeout = 5000;
  const deadline = start + retryTimeout;
  const isRetryable = err => {
    const msg = err?.message || '';
    return /stale element/i.test(msg) || /element wasn't found/i.test(msg);
  };
  let attempt = 0;
  let preInfoLogged = false;
  let lastErr;

  while (Date.now() < deadline) {
    attempt++;
    let element;
    try {
      element = await getter();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err)) {
        console.log(`[debugClick:${label}] getter failed (attempt ${attempt}): ${err.message}`);
        break;
      }
      await browser.pause(50);
      continue;
    }

    if (!preInfoLogged) {
      let preInfo = '?';
      try {
        const tag = await element.getTagName();
        const text = (await element.getText()).slice(0, 80);
        const exists = await element.isExisting();
        const displayed = exists ? await element.isDisplayed() : false;
        preInfo = `<${tag}> exists=${exists} displayed=${displayed} text="${text}"`;
      } catch (e) {
        preInfo = `(pre-info failed: ${e.message})`;
      }
      console.log(`[debugClick:${label}] pre-click: ${preInfo}`);
      preInfoLogged = true;
    }

    try {
      await element.click();
      const elapsed = Date.now() - start;
      if (attempt === 1) {
        console.log(`[debugClick:${label}] click OK after ${elapsed}ms`);
      } else {
        console.log(`[debugClick:${label}] click OK on attempt ${attempt} after ${elapsed}ms`);
      }
      return;
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err)) {
        const elapsed = Date.now() - start;
        console.log(
          `[debugClick:${label}] CLICK FAILED (non-retryable) attempt ${attempt} ${elapsed}ms: ${err.message}`
        );
        break;
      }
      console.log(`[debugClick:${label}] retryable error on attempt ${attempt} at ${Date.now() - start}ms, retrying`);
      await browser.pause(50);
    }
  }

  console.log(`[debugClick:${label}] GAVE UP after ${Date.now() - start}ms (${attempt} attempts): ${lastErr?.message}`);

  if (watchSelector) {
    try {
      /* eslint-disable no-undef */
      const log = await browser.execute(() => window.__dbgLog || []);
      console.log(`[debugClick:${label}] mutations during click attempts (${log.length} total, showing last 40):`);
      for (const e of log.slice(-40)) {
        console.log(`  ${JSON.stringify(e)}`);
      }
      const html = await browser.execute((sel) => {
        const el = document.querySelector(sel);
        return el ? el.outerHTML.slice(0, 4000) : 'NOT FOUND';
      }, watchSelector);
      /* eslint-enable no-undef */
      console.log(`[debugClick:${label}] watched container (${watchSelector}) outerHTML (truncated):\n${html}`);
    } catch (e) {
      console.log(`[debugClick:${label}] mutation log fetch failed: ${e.message}`);
    }
  }

  try {
    const path = `/tmp/debugclick-${label.replace(/\W+/g, '_')}-${Date.now()}.png`;
    await browser.saveScreenshot(path);
    console.log(`[debugClick:${label}] screenshot saved to ${path}`);
  } catch (e) {
    console.log(`[debugClick:${label}] screenshot failed: ${e.message}`);
  }

  throw lastErr;
};

module.exports = { debugClick };

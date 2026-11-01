from playwright.sync_api import sync_playwright
d="/tmp/claude-0/-home-claude/edc74210-fbf7-5506-b69c-c23aa0218f4c/scratchpad/t"
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={"width":390,"height":844})
    errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("file://"+d+"/index.html");pg.wait_for_timeout(500)
    pg.fill("#nameInput","Julio");pg.click("#nameForm button");pg.wait_for_timeout(200)
    pg.click(".tab[data-tab=carte]");pg.wait_for_timeout(300)
    links=pg.evaluate("(window.__pop||[]).slice(-2).map(n=>[...n.querySelectorAll('a')].map(a=>a.textContent+' '+a.href))")
    print("errors:",errs);print(links)
    b.close()

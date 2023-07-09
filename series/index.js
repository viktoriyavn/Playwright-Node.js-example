const {chromium} = require('playwright');
(async () => {
    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-features=site-per-process'],
        args: ['--window-size=1920,1080']
    })
    const currentContext = await browser.newContext({
        //videosPath: 'videos/',
        recordVideo: {
            dir: 'videos/',
            size: { width: 800, height: 700 }
        }
    });
    const page = await currentContext.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("https://myshows.me/");
    await page.click('[class="Login-login tablet desktop"]');
    await page.click('[name="login"]');
    await page.fill('[name="login"]', 'nyuvv42@gmail.com');
    await page.click('[name="password"]');
    await page.fill('[name="password"]', 'b11cad699a');
    await Promise.all([
        page.waitForURL("https://myshows.me/my/"),
        page.click('button')
    ]);
    await Promise.all([
        page.waitForURL("https://myshows.me/Mrs_Robinson"),
        page.click('a:has-text("Профиль")')
    ]);
    await page.click('.TabsItem-counter');
    await page.click('.User-showsMore');
    //let viewingList = await page.$$(".User-shows>.Container>div[title=\"Смотрю\"] .User-show.UserShowItem");
    let taskList = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.User-shows>.Container>div[title="Смотрю"] .User-show.UserShowItem')).map((el) => {
            let titleEl = el.querySelector('.UserShowItem-title');
            return {
                title: titleEl.textContent.trim()
                , url: titleEl.href
            };
        })
    });
    //await page.pause();
    let resultList = [];
    let pages = [null,null,null,null,null];
    do{
        let tasksPromises = [];
        for (let i=0;i<5 && taskList.length > 0;i++) {
            let currentTask = taskList.pop();
            tasksPromises.push((async ([task, idx]) => {
                pages[idx] = pages[idx]??(await currentContext.newPage());
                let taskPage = pages[idx];
                try {
                    await taskPage.goto(task.url);
                    let resultElement = await taskPage.evaluate(() => {
                        let rating = document.querySelector('.ShowRating-value').children[0].textContent.trim();
                        let seriesTitle = document.querySelector('.title__main').textContent.trim();
                        let seasonsConainersList = document.querySelectorAll('.episodes-by-season__season');
                        let seasons = [];
                        let missed;
                        let missedSeason = 0;
                        for(let seasonContainer of seasonsConainersList){
                            let seasonNumber = seasonContainer.querySelector('.title.title__secondary.title__space-m').id.split('-').pop();
                            let seasonViewed = seasonContainer.querySelector('.EpisodeWatchLabel.checked')?true:false;
                            if (seasonViewed === false){
                                missedSeason ++;
                            }
                            seasons.push({number:seasonNumber,viewed:seasonViewed});
                            missed = missedSeason;
                        }
                        return {
                            rating: rating,
                            title: seriesTitle,
                            missed:missed,
                            seasons:seasons
                        };
                    });
                    return {
                        result: resultElement
                    };
                }catch (ex){
                    taskList.unshift(task);
                    throw ex;
                }
            })([currentTask,i]));
        }
        let tmpResult = await Promise.allSettled(tasksPromises);
        for (let itemResult of tmpResult){
            if (itemResult.status==='fulfilled'){
                resultList.push(itemResult.value);
            }else{
                console.log(itemResult.reason);
            }
        }
    }while(taskList.length>0);
    for (let tp of pages)
        await tp.close();
    console.log(resultList);
    await page.close();
    await currentContext.close();
    await browser.close();
})();
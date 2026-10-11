import {test,expect} from '@playwright/test';

test.use({isMobile:false,hasTouch:false,deviceScaleFactor:1,viewport:{width:1440,height:1000}});

for(const role of ['rider','driver','operator'] as const){
  test(`${role} layouts fit every viewport, theme and language`,async({page},testInfo)=>{
    test.setTimeout(60000);
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/');
    if(role!=='rider'){
      await page.getByRole('button',{name:'Sign in',exact:true}).click();
      await page.getByRole('button',{name:`Try ${role}`,exact:true}).click();
      await expect(page.getByRole('heading',{name:role==='driver'?'Your trips':'Local operations',exact:true})).toBeVisible();
      await expect(page.locator(role==='driver'?'.trip-card':'.operator-card').first()).toBeVisible();
      await expect(page.locator('.stat strong').first()).not.toHaveText('—');
      await expect(page.getByText('You are signed in',{exact:true})).not.toBeVisible();
    }else{
      await page.getByRole('button',{name:'Tomorrow',exact:true}).click();
      await expect(page.locator('.ride-card').first()).toBeVisible();
    }
    await expect(page.getByRole('main').locator('[aria-busy=true]')).toHaveCount(0);
    for(const width of [360,768,1440]){
      await page.setViewportSize({width,height:1000});
      for(const language of ['en','hi']){
        if(await page.locator('html').getAttribute('lang')!==language)await page.locator('.language-button').click();
        for(const theme of ['light','dark']){
          await page.locator('.appearance-select').selectOption(theme);
          await expect(page.locator('html')).toHaveClass(new RegExp(theme));
          expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
          await page.screenshot({path:testInfo.outputPath(`${role}-${width}-${language}-${theme}.png`),fullPage:role==='rider'});
        }
      }
    }
    expect(errors).toEqual([]);
  });
}

test('navigation and dialogs provide immediate visible feedback',async({page},testInfo)=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Where are you headed?'})).toBeVisible();
  const timings=await page.evaluate(async()=>{
    const samples:{action:string;ms:number}[]=[];
    async function measure(action:string,button:HTMLElement,ready:()=>boolean){
      const start=performance.now();button.click();
      await new Promise<void>((resolve,reject)=>{
        const deadline=performance.now()+2000;
        function check(){if(ready())resolve();else if(performance.now()>deadline)reject(new Error(`No feedback: ${action}`));else requestAnimationFrame(check);}
        requestAnimationFrame(check);
      });
      samples.push({action,ms:performance.now()-start});
    }
    const nav=document.querySelector('nav[aria-label="Main navigation"]')!;
    for(let i=0;i<5;i++){
      const buttons=Array.from(nav.querySelectorAll('button'));
      await measure('Help',buttons.find(button=>button.textContent==='Help')!,()=>Array.from(document.querySelectorAll('h1')).some(h=>h.textContent==='Need a hand?'&&h.checkVisibility()));
      await measure('Book a ride',buttons.find(button=>button.textContent==='Book a ride')!,()=>Array.from(document.querySelectorAll('h1')).some(h=>h.textContent==='Where are you headed?'&&h.checkVisibility()));
    }
    await measure('Sign-in dialog',Array.from(document.querySelectorAll('header button')).find(button=>button.textContent==='Sign in') as HTMLElement,()=>!!document.querySelector('[role=dialog]'));
    return samples;
  });
  await testInfo.attach('interaction-times',{body:JSON.stringify(timings,null,2),contentType:'application/json'});
  console.log('Interaction timings (ms):',JSON.stringify(timings));
  expect(timings.every(sample=>sample.ms<500)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  const duration=await page.getByRole('dialog').evaluate(element=>parseFloat(getComputedStyle(element).animationDuration));
  expect(duration).toBeLessThan(.01);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeFocused();
});

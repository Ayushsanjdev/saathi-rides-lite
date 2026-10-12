import {test,expect,type Page} from '@playwright/test';

const nav = (page:Page,name:string) => page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('button',{name,exact:true});

test('search and passenger count survive visiting help',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Tomorrow',exact:true}).click();
  await page.getByRole('combobox',{name:'Destination',exact:true}).click();
  await page.getByRole('option',{name:'Community clinic',exact:true}).click();
  await page.getByRole('button',{name:'Add passenger',exact:true}).click();
  await expect(page.locator('.ride-card').first()).toContainText('Community clinic');
  const date=await page.getByLabel('Departure date',{exact:true}).inputValue();
  await nav(page,'Help').click();
  await expect(page.getByRole('heading',{name:'Need a hand?'})).toBeVisible();
  await nav(page,'Book a ride').click();
  await expect(page.getByLabel('Departure date',{exact:true})).toHaveValue(date);
  await expect(page.getByRole('combobox',{name:'Destination',exact:true})).toContainText('Community clinic');
  await expect(page.locator('.passenger-control strong')).toHaveText('2');
});

test('session resolution does not flash a rider workspace',async({page})=>{
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/me',async route=>{await gate;await route.continue();});
  await page.goto('/');
  try {
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Where are you headed?'})).not.toBeVisible();
    await expect(page.getByRole('main').locator('[aria-busy=true]').first()).toBeVisible();
  } finally {release();}
  await expect(page.getByRole('heading',{name:'Where are you headed?'})).toBeVisible();
});

test('a failed background refresh keeps cached rides visible',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Tomorrow',exact:true}).click();
  await expect(page.locator('.ride-card').first()).toBeVisible();
  const route=await page.locator('.ride-card .route-names').first().innerText();
  await page.route('**/api/departures?*',route=>route.fulfill({status:503,json:{error:{message:'Temporary refresh failure'}}}));
  await page.getByRole('button',{name:'Find rides',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Temporary refresh failure'})).toBeVisible();
  await expect(page.locator('.ride-card .route-names').first()).toHaveText(route.replace(/\n/g,''));
});

test('slow new searches never display the old route as current',async({page})=>{
  await page.goto('/');
  await page.getByRole('combobox',{name:'Destination',exact:true}).click();
  await page.getByRole('option',{name:'Town bus stand',exact:true}).click();
  await page.getByRole('button',{name:'Tomorrow',exact:true}).click();
  await expect(page.locator('.ride-card').first()).toContainText('Town bus stand');
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/departures?*',async route=>{await gate;await route.continue();});
  await page.getByRole('combobox',{name:'Destination',exact:true}).click();
  await page.getByRole('option',{name:'Community clinic',exact:true}).click();
  try {
    await expect(page.locator('.ride-card')).toHaveCount(0);
    await expect(page.getByRole('main').locator('[aria-busy=true]')).toBeVisible();
    await nav(page,'Help').click();
    await expect(page.getByRole('heading',{name:'Need a hand?'})).toBeVisible();
  } finally {release();}
});

test('cached booking history reopens without waiting for the network',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('button',{name:'Try passenger',exact:true}).click();
  await nav(page,'My rides').click();
  await expect(page.getByRole('main').locator('[aria-busy=true]')).toHaveCount(0);
  await page.getByRole('tab',{name:'History',exact:true}).click();
  await nav(page,'Help').click();
  await page.route('**/api/bookings?*',route=>route.abort());
  await nav(page,'My rides').click();
  await expect(page.getByRole('tab',{name:'History',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('main').locator('[aria-busy=true]')).toHaveCount(0);
});

test('logout resets private drafts before another account signs in',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('button',{name:'Try passenger',exact:true}).click();
  await page.getByRole('button',{name:'Add passenger',exact:true}).click();
  await nav(page,'Account').click();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page.locator('.passenger-control strong')).toHaveText('1');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.getByLabel('Full name',{exact:true}).fill('Another rider');
  await page.getByLabel('Email',{exact:true}).fill(`rider-${Date.now()}@saathi.test`);
  await page.getByLabel('Password',{exact:true}).fill('AnotherRider2026!');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await nav(page,'My rides').click();
  await expect(page.getByRole('heading',{name:'No bookings yet',exact:true})).toBeVisible();
  await expect(page.locator('.booking-card')).toHaveCount(0);
});

test('guest booking survives sign-in and repeated confirmation clicks send one request',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Tomorrow',exact:true}).click();
  await page.getByRole('button',{name:'Book ride',exact:true}).first().click();
  await page.getByRole('button',{name:'Try passenger',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Review booking'})).toBeVisible();
  await page.getByLabel('Mobile number').fill('9000000099');
  let requests=0;let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/bookings',async route=>{
    if(route.request().method()!=='POST')return route.continue();
    requests++;await gate;await route.continue();
  });
  try {
    const confirm=page.getByRole('button',{name:'Confirm booking',exact:true});
    await confirm.evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
    await expect(page.getByRole('button',{name:'Please wait',exact:true})).toBeDisabled();
    await expect.poll(()=>requests).toBe(1);
    await expect(page.getByText('Booking confirmed',{exact:true})).not.toBeVisible();
  } finally {release();}
  await expect(page.getByText('Booking confirmed',{exact:true})).toBeVisible();
  expect(requests).toBe(1);
});

test('operator submissions suppress repeated clicks before the pending render',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('button',{name:'Try operator',exact:true}).click();
  await page.getByRole('button',{name:'New departure',exact:true}).click();
  await page.getByLabel('Departure date and time').fill(new Date(Date.now()+13*86400000+330*60000).toISOString().slice(0,16));
  let requests=0;let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/operator/departures',async route=>{
    if(route.request().method()!=='POST')return route.continue();
    requests++;await gate;await route.continue();
  });
  try {
    await page.getByRole('button',{name:'Create departure',exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
    await expect.poll(()=>requests).toBe(1);
  }finally{release();}
  await expect(page.getByText('Departure created',{exact:true})).toBeVisible();
  expect(requests).toBe(1);
});

test('passenger manifests open immediately while their request is pending',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('button',{name:'Try driver',exact:true}).click();
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/driver/trips/*/manifest',async route=>{await gate;await route.continue();});
  const opener=page.getByRole('button',{name:'Passenger list',exact:true}).first();
  await opener.click();
  const dialog=page.getByRole('dialog',{name:'Passenger list'});
  try{
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[aria-busy=true]')).toBeVisible();
  }finally{release();}
  await expect(dialog.locator('[aria-busy=true]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
});


test('demo credentials stay accessible during registration, navigation and signed-in sessions',async({page})=>{
  await page.goto('/');
  const access=page.locator('.demo-access').getByRole('button',{name:'Use a demo account',exact:true});
  await expect(access).toBeVisible();
  await nav(page,'Help').click();
  await expect(access).toBeVisible();
  await access.click();
  const accounts=page.getByRole('region',{name:'Use a demo account'});
  await expect(accounts).toContainText('Demo password: SaathiDemo2026!');
  await expect(accounts.getByText('passenger@saathi.test',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Create your account'})).toBeVisible();
  await expect(accounts).toBeVisible();
  await accounts.getByRole('button',{name:'Try passenger',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Account',exact:true}).first()).toBeVisible();
  await expect(access).toBeVisible();
  await access.click();
  await expect(accounts.getByText('operator@saathi.test',{exact:true})).toBeVisible();
});

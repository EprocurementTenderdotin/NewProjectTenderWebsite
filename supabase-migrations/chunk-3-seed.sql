-- ============================================================================
-- eProcurementTender.com — CHUNK 3: Seed Data
-- Re-runnable: cleans reference data + tenders first, then repopulates.
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- ============================================================================
-- 0. Add missing tender columns (tender_fee + security_deposit_amount)
-- ============================================================================
alter table public.tenders
  add column if not exists tender_fee numeric(15, 2),
  add column if not exists security_deposit_amount numeric(15, 2);

-- ============================================================================
-- 1. CLEAN previous seed (safe — applications not touched)
-- ============================================================================
delete from public.tenders;
delete from public.tender_categories;
delete from public.districts;
delete from public.states;

-- ============================================================================
-- 2. STATES — 28 states + 8 UTs
-- ============================================================================
insert into public.states (name, code) values
  ('Andhra Pradesh','AP'),('Arunachal Pradesh','AR'),('Assam','AS'),('Bihar','BR'),
  ('Chhattisgarh','CG'),('Goa','GA'),('Gujarat','GJ'),('Haryana','HR'),
  ('Himachal Pradesh','HP'),('Jharkhand','JH'),('Karnataka','KA'),('Kerala','KL'),
  ('Madhya Pradesh','MP'),('Maharashtra','MH'),('Manipur','MN'),('Meghalaya','ML'),
  ('Mizoram','MZ'),('Nagaland','NL'),('Odisha','OD'),('Punjab','PB'),
  ('Rajasthan','RJ'),('Sikkim','SK'),('Tamil Nadu','TN'),('Telangana','TS'),
  ('Tripura','TR'),('Uttar Pradesh','UP'),('Uttarakhand','UK'),('West Bengal','WB'),
  ('Andaman and Nicobar Islands','AN'),('Chandigarh','CH'),
  ('Dadra and Nagar Haveli and Daman and Diu','DH'),('Delhi','DL'),
  ('Jammu and Kashmir','JK'),('Ladakh','LA'),('Lakshadweep','LD'),('Puducherry','PY');

-- ============================================================================
-- 3. DISTRICTS — 4 per state/UT (144 total)
-- ============================================================================
with s as (select id, code from public.states)
insert into public.districts (state_id, name)
select s.id, d.name from s
join (values
  ('AP','Visakhapatnam'),('AP','Vijayawada'),('AP','Guntur'),('AP','Tirupati'),
  ('AR','Itanagar'),('AR','Tawang'),('AR','Ziro'),('AR','Pasighat'),
  ('AS','Guwahati'),('AS','Dibrugarh'),('AS','Silchar'),('AS','Jorhat'),
  ('BR','Patna'),('BR','Gaya'),('BR','Bhagalpur'),('BR','Muzaffarpur'),
  ('CG','Raipur'),('CG','Bilaspur'),('CG','Durg'),('CG','Korba'),
  ('GA','Panaji'),('GA','Margao'),('GA','Vasco da Gama'),('GA','Mapusa'),
  ('GJ','Ahmedabad'),('GJ','Surat'),('GJ','Vadodara'),('GJ','Rajkot'),
  ('HR','Gurugram'),('HR','Faridabad'),('HR','Panipat'),('HR','Karnal'),
  ('HP','Shimla'),('HP','Manali'),('HP','Dharamshala'),('HP','Mandi'),
  ('JH','Ranchi'),('JH','Jamshedpur'),('JH','Dhanbad'),('JH','Bokaro'),
  ('KA','Bengaluru Urban'),('KA','Mysuru'),('KA','Mangaluru'),('KA','Hubballi'),
  ('KL','Thiruvananthapuram'),('KL','Kochi'),('KL','Kozhikode'),('KL','Thrissur'),
  ('MP','Bhopal'),('MP','Indore'),('MP','Gwalior'),('MP','Jabalpur'),
  ('MH','Mumbai'),('MH','Pune'),('MH','Nagpur'),('MH','Nashik'),
  ('MN','Imphal East'),('MN','Imphal West'),('MN','Churachandpur'),('MN','Bishnupur'),
  ('ML','Shillong'),('ML','Tura'),('ML','Jowai'),('ML','Nongstoin'),
  ('MZ','Aizawl'),('MZ','Lunglei'),('MZ','Champhai'),('MZ','Serchhip'),
  ('NL','Kohima'),('NL','Dimapur'),('NL','Mokokchung'),('NL','Tuensang'),
  ('OD','Bhubaneswar'),('OD','Cuttack'),('OD','Rourkela'),('OD','Puri'),
  ('PB','Ludhiana'),('PB','Amritsar'),('PB','Jalandhar'),('PB','Patiala'),
  ('RJ','Jaipur'),('RJ','Jodhpur'),('RJ','Udaipur'),('RJ','Kota'),
  ('SK','Gangtok'),('SK','Namchi'),('SK','Mangan'),('SK','Gyalshing'),
  ('TN','Chennai'),('TN','Coimbatore'),('TN','Madurai'),('TN','Tiruchirappalli'),
  ('TS','Hyderabad'),('TS','Warangal'),('TS','Nizamabad'),('TS','Karimnagar'),
  ('TR','Agartala'),('TR','Udaipur'),('TR','Kailashahar'),('TR','Dharmanagar'),
  ('UP','Lucknow'),('UP','Kanpur'),('UP','Noida'),('UP','Varanasi'),
  ('UK','Dehradun'),('UK','Haridwar'),('UK','Nainital'),('UK','Rishikesh'),
  ('WB','Kolkata'),('WB','Howrah'),('WB','Darjeeling'),('WB','Siliguri'),
  ('AN','Port Blair'),('AN','Diglipur'),('AN','Car Nicobar'),('AN','Rangat'),
  ('CH','Chandigarh'),('CH','Manimajra'),('CH','Sector 17'),('CH','Sector 22'),
  ('DH','Daman'),('DH','Diu'),('DH','Silvassa'),('DH','Dadra'),
  ('DL','New Delhi'),('DL','South Delhi'),('DL','North Delhi'),('DL','East Delhi'),
  ('JK','Srinagar'),('JK','Jammu'),('JK','Anantnag'),('JK','Baramulla'),
  ('LA','Leh'),('LA','Kargil'),('LA','Nubra'),('LA','Zanskar'),
  ('LD','Kavaratti'),('LD','Agatti'),('LD','Minicoy'),('LD','Andrott'),
  ('PY','Puducherry'),('PY','Karaikal'),('PY','Yanam'),('PY','Mahe')
) as d(state_code, name) on d.state_code = s.code;

-- ============================================================================
-- 4. TENDER CATEGORIES — 85 categories with tender_type_tag
-- ============================================================================
insert into public.tender_categories (name, tender_type_tag, description, display_order) values
  -- GOODS (32)
  ('Medical Equipment','Goods','Hospital & clinical equipment supply',1),
  ('Pharmaceutical Supplies','Goods','Medicines & pharmaceutical drugs',2),
  ('Office Furniture','Goods','Desks, chairs, cabinets',3),
  ('IT Hardware','Goods','Computers, servers, peripherals',4),
  ('Networking Equipment','Goods','Routers, switches, cables',5),
  ('Laboratory Equipment','Goods','Scientific instruments & apparatus',6),
  ('Vehicles & Automobiles','Goods','Cars, buses, ambulances, trucks',7),
  ('Solar Panels','Goods','Photovoltaic panels & inverters',8),
  ('Uniforms & Textiles','Goods','Staff uniforms & fabrics',9),
  ('Stationery Supplies','Goods','Office & school stationery',10),
  ('Printing Materials','Goods','Paper, ink, toners',11),
  ('Kitchen Equipment','Goods','Commercial kitchen appliances',12),
  ('Books & Publications','Goods','Library books & journals',13),
  ('Sports Equipment','Goods','Athletic gear & fitness equipment',14),
  ('Safety Equipment','Goods','PPE, helmets, safety gear',15),
  ('Electrical Fittings','Goods','Switches, wires, fixtures',16),
  ('Water Purifiers','Goods','RO & purification systems',17),
  ('Agricultural Equipment','Goods','Tractors, harvesters, tools',18),
  ('Fertilizers & Seeds','Goods','Agricultural inputs',19),
  ('CCTV & Security Systems','Goods','Surveillance equipment',20),
  ('Air Conditioners','Goods','ACs & climate control',21),
  ('Fire Safety Equipment','Goods','Extinguishers, alarms, hoses',22),
  ('Lab Chemicals','Goods','Reagents & consumables',23),
  ('Auto Spare Parts','Goods','Vehicle spares',24),
  ('Diesel Generators','Goods','Power backup DG sets',25),
  ('Solar Water Heaters','Goods','Solar heating systems',26),
  ('LED Lights','Goods','Streetlights & indoor LED',27),
  ('Musical Instruments','Goods','School & event instruments',28),
  ('Hospital Beds','Goods','ICU & general ward beds',29),
  ('Diagnostic Kits','Goods','Test kits & reagents',30),
  ('Dairy Equipment','Goods','Milk processing machinery',31),
  ('Fishing Nets & Gear','Goods','Fishery supplies',32),

  -- WORKS (22)
  ('Road Construction','Works','New road building & paving',33),
  ('Bridge Construction','Works','Bridge & flyover works',34),
  ('Building Construction','Works','Public buildings & offices',35),
  ('School Construction','Works','Schools & educational campuses',36),
  ('Hospital Construction','Works','Health centres & hospitals',37),
  ('Water Supply Works','Works','Pipeline & distribution networks',38),
  ('Sewerage Works','Works','Sewage lines & treatment',39),
  ('Irrigation Works','Works','Canals, dams, tanks',40),
  ('Electrification Works','Works','Rural & urban power lines',41),
  ('Railway Works','Works','Track laying & station works',42),
  ('Airport Works','Works','Runway & terminal construction',43),
  ('Port Construction','Works','Jetty & harbour works',44),
  ('Housing Construction','Works','Public housing projects',45),
  ('Renovation Works','Works','Building repair & renovation',46),
  ('Roof Waterproofing','Works','Waterproofing & insulation',47),
  ('Interior Fit-out','Works','Office & institutional interiors',48),
  ('Landscaping Works','Works','Gardens, parks, greenery',49),
  ('Boundary Wall Works','Works','Compound & security walls',50),
  ('Solar Plant Installation','Works','Grid-scale solar plants',51),
  ('Metro Rail Works','Works','Metro civil & track works',52),
  ('Underground Cabling','Works','HT/LT cable laying',53),
  ('Drainage Works','Works','Storm & waste drainage',54),

  -- SERVICES (28)
  ('Housekeeping Services','Services','Cleaning & janitorial',55),
  ('Security Services','Services','Armed & unarmed guards',56),
  ('Catering Services','Services','Institutional catering',57),
  ('Transportation Services','Services','Passenger & goods transport',58),
  ('Manpower Supply','Services','Skilled & unskilled labour',59),
  ('IT Services','Services','Software development & support',60),
  ('Consultancy Services','Services','Advisory & audit services',61),
  ('Legal Services','Services','Legal advisory & litigation',62),
  ('Auditing Services','Services','Statutory & internal audits',63),
  ('Training Services','Services','Skill development programs',64),
  ('Event Management','Services','Conference & event handling',65),
  ('Waste Management','Services','MSW collection & disposal',66),
  ('Vehicle Hiring','Services','Hire of official vehicles',67),
  ('AMC Services','Services','Annual maintenance contracts',68),
  ('Data Entry Services','Services','Digitization & typing',69),
  ('Facility Management','Services','Integrated FM services',70),
  ('Pest Control','Services','Pest & termite control',71),
  ('Landscaping Maintenance','Services','Garden upkeep',72),
  ('Digital Marketing','Services','SEO, social media, ads',73),
  ('Software Licensing','Services','Enterprise software licences',74),
  ('Cloud Hosting','Services','Cloud & data centre hosting',75),
  ('Ambulance Services','Services','108/emergency ambulance ops',76),
  ('Solar O&M','Services','Solar plant operations & upkeep',77),
  ('Cyber Security Services','Services','Security audit & SOC',78),
  ('Survey & Mapping','Services','GIS, drone, cadastral surveys',79),
  ('Insurance Services','Services','Group & asset insurance',80),
  ('Printing & Publishing','Services','Books, reports, magazines',81),
  ('Laundry Services','Services','Institutional laundry',82),

  -- MULTIPLE (3)
  ('Turnkey Projects','Multiple','Design + supply + install',83),
  ('EPC Contracts','Multiple','Engineering, procurement, construction',84),
  ('Hospital Turnkey','Multiple','Complete hospital setup',85);

-- ============================================================================
-- 5. TENDERS — 160 records, generated programmatically
-- ============================================================================
do $$
declare
  v_state_ids uuid[];
  v_category_row record;
  v_state_id uuid;
  v_district_id uuid;
  v_category_id uuid;
  v_type_tag text;
  v_est numeric(15,2);
  v_emd numeric(15,2);
  v_sd numeric(15,2);
  v_fee numeric(15,2);
  v_status text;
  v_active boolean;
  v_pub_offset int;
  v_sub_offset int;
  v_open_offset int;
  v_ref text;
  v_title text;
  v_auth text;
  v_authorities text[] := array[
    'Public Works Department','Municipal Corporation','District Collector Office',
    'Health & Family Welfare Dept','Rural Development Dept','Urban Development Authority',
    'Electricity Board','Water Supply Board','Housing Board','Education Department',
    'Directorate of Industries','Pollution Control Board','Road Transport Corporation',
    'Irrigation Department','Agriculture Department','Forest Department',
    'Public Health Engineering','Sports Authority','Cultural Affairs Dept','Fisheries Dept'
  ];
  v_dist_row record;
  i int;
begin
  -- distribution: 40% Goods, 35% Services, 25% Works (rounded to 160 total)
  -- Goods 64, Services 56, Works 40
  for i in 1..160 loop
    -- pick a type by index to keep the distribution
    if i <= 64 then
      v_type_tag := 'Goods';
    elsif i <= 120 then
      v_type_tag := 'Services';
    else
      v_type_tag := 'Works';
    end if;

    -- random category of that type
    select id into v_category_id
      from public.tender_categories
      where tender_type_tag = v_type_tag
      order by random() limit 1;

    -- random state + one of its districts
    select d.state_id, d.id into v_dist_row
      from public.districts d
      order by random() limit 1;
    v_state_id := v_dist_row.state_id;
    v_district_id := v_dist_row.id;

    -- estimated value — spread Rs 5L .. Rs 50Cr, log-ish
    v_est := round(
      (500000 + (power(random(), 2.2) * (500000000 - 500000)))::numeric,
      -3
    );

    -- financials
    v_sd  := round(v_est * 0.05, 2);       -- 5% security deposit
    v_emd := round(v_est * 0.02, 2);       -- 2% EMD
    v_fee := case
      when v_est <  1000000  then 500
      when v_est <  10000000 then 2000
      when v_est <  50000000 then 5000
      when v_est < 200000000 then 10000
      else 25000
    end;

    -- status distribution: 80% active, 15% closed, 5% inactive
    if random() < 0.80 then
      v_status := 'active';  v_active := true;
    elsif random() < 0.75 then
      v_status := 'closed';  v_active := true;
    else
      v_status := 'inactive'; v_active := false;
    end if;

    -- relative dates
    v_pub_offset  := -1 * (5 + floor(random() * 40))::int;   -- 5–45 days ago
    v_sub_offset  := 10 + floor(random() * 40)::int;         -- 10–50 days future
    v_open_offset := v_sub_offset + 2 + floor(random() * 5)::int;

    -- title = category name + authority
    select name into v_title from public.tender_categories where id = v_category_id;
    v_auth := v_authorities[1 + floor(random() * array_length(v_authorities,1))::int];
    v_title := v_title || ' — ' || v_auth;
    v_ref := 'TEN/' || to_char(now(), 'YYYY') || '/' || lpad(i::text, 5, '0');

    insert into public.tenders (
      tender_reference, title, description,
      category_id, state_id, district_id,
      estimated_value, currency,
      issuing_authority,
      publish_date, submission_deadline, opening_date,
      date_mode, publish_offset_days, submission_offset_days, opening_offset_days, auto_update_dates,
      emd_amount, tender_fee, security_deposit_amount,
      status, is_active
    ) values (
      v_ref, v_title,
      'Procurement/execution notice for ' || v_title || '. Interested bidders may refer to the detailed scope in the official tender document.',
      v_category_id, v_state_id, v_district_id,
      v_est, 'INR',
      v_auth,
      (current_date + v_pub_offset)::date,
      (now() + (v_sub_offset  || ' days')::interval),
      (now() + (v_open_offset || ' days')::interval),
      'relative', v_pub_offset, v_sub_offset, v_open_offset, true,
      v_emd, v_fee, v_sd,
      v_status, v_active
    );
  end loop;
end $$;

-- ============================================================================
-- 6. VERIFY
-- ============================================================================
-- select count(*) from public.states;              -- 36
-- select count(*) from public.districts;           -- 144
-- select count(*) from public.tender_categories;   -- 85
-- select count(*) from public.tenders;             -- 160
-- select tender_type_tag, count(*) from public.tender_categories group by 1;
-- select status, count(*) from public.tenders group by 1;
-- select min(estimated_value), max(estimated_value) from public.tenders;
-- ============================================================================

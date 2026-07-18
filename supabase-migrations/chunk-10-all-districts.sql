-- ============================================================================
-- CHUNK 10: Full district list for all Indian states / UTs.
-- Re-runnable: wipes existing districts and repopulates.
-- Applications reference districts via ON DELETE CASCADE, so run only when the
-- district set needs to be reset; existing applications will lose their
-- district_id link. In production prefer additive inserts.
-- ============================================================================

-- Additive insert: only rows that don't already exist for the same (state, name).
with s as (select id, code from public.states)
insert into public.districts (state_id, name)
select s.id, d.name
from s
join (values
  -- Andhra Pradesh (26)
  ('AP','Alluri Sitharama Raju'),('AP','Anakapalli'),('AP','Anantapur'),('AP','Annamayya'),('AP','Bapatla'),
  ('AP','Chittoor'),('AP','East Godavari'),('AP','Eluru'),('AP','Guntur'),('AP','Kakinada'),
  ('AP','Krishna'),('AP','Kurnool'),('AP','Nandyal'),('AP','NTR'),('AP','Palnadu'),
  ('AP','Parvathipuram Manyam'),('AP','Prakasam'),('AP','Sri Sathya Sai'),('AP','Srikakulam'),
  ('AP','Sri Potti Sriramulu Nellore'),('AP','Tirupati'),('AP','Visakhapatnam'),('AP','Vizianagaram'),
  ('AP','West Godavari'),('AP','YSR Kadapa'),('AP','Konaseema'),

  -- Arunachal Pradesh (26)
  ('AR','Anjaw'),('AR','Changlang'),('AR','Dibang Valley'),('AR','East Kameng'),('AR','East Siang'),
  ('AR','Kamle'),('AR','Kra Daadi'),('AR','Kurung Kumey'),('AR','Lepa Rada'),('AR','Lohit'),
  ('AR','Longding'),('AR','Lower Dibang Valley'),('AR','Lower Siang'),('AR','Lower Subansiri'),
  ('AR','Namsai'),('AR','Pakke Kessang'),('AR','Papum Pare'),('AR','Shi Yomi'),('AR','Siang'),
  ('AR','Tawang'),('AR','Tirap'),('AR','Upper Siang'),('AR','Upper Subansiri'),('AR','West Kameng'),
  ('AR','West Siang'),('AR','Itanagar Capital Complex'),

  -- Assam (35)
  ('AS','Baksa'),('AS','Barpeta'),('AS','Biswanath'),('AS','Bongaigaon'),('AS','Cachar'),
  ('AS','Charaideo'),('AS','Chirang'),('AS','Darrang'),('AS','Dhemaji'),('AS','Dhubri'),
  ('AS','Dibrugarh'),('AS','Dima Hasao'),('AS','Goalpara'),('AS','Golaghat'),('AS','Hailakandi'),
  ('AS','Hojai'),('AS','Jorhat'),('AS','Kamrup'),('AS','Kamrup Metropolitan'),('AS','Karbi Anglong'),
  ('AS','Karimganj'),('AS','Kokrajhar'),('AS','Lakhimpur'),('AS','Majuli'),('AS','Morigaon'),
  ('AS','Nagaon'),('AS','Nalbari'),('AS','Sivasagar'),('AS','Sonitpur'),('AS','South Salmara-Mankachar'),
  ('AS','Tinsukia'),('AS','Udalguri'),('AS','West Karbi Anglong'),('AS','Bajali'),('AS','Tamulpur'),

  -- Bihar (38)
  ('BR','Araria'),('BR','Arwal'),('BR','Aurangabad'),('BR','Banka'),('BR','Begusarai'),
  ('BR','Bhagalpur'),('BR','Bhojpur'),('BR','Buxar'),('BR','Darbhanga'),('BR','East Champaran'),
  ('BR','Gaya'),('BR','Gopalganj'),('BR','Jamui'),('BR','Jehanabad'),('BR','Kaimur'),
  ('BR','Katihar'),('BR','Khagaria'),('BR','Kishanganj'),('BR','Lakhisarai'),('BR','Madhepura'),
  ('BR','Madhubani'),('BR','Munger'),('BR','Muzaffarpur'),('BR','Nalanda'),('BR','Nawada'),
  ('BR','Patna'),('BR','Purnia'),('BR','Rohtas'),('BR','Saharsa'),('BR','Samastipur'),
  ('BR','Saran'),('BR','Sheikhpura'),('BR','Sheohar'),('BR','Sitamarhi'),('BR','Siwan'),
  ('BR','Supaul'),('BR','Vaishali'),('BR','West Champaran'),

  -- Chhattisgarh (33)
  ('CG','Balod'),('CG','Baloda Bazar'),('CG','Balrampur'),('CG','Bastar'),('CG','Bemetara'),
  ('CG','Bijapur'),('CG','Bilaspur'),('CG','Dantewada'),('CG','Dhamtari'),('CG','Durg'),
  ('CG','Gariaband'),('CG','Gaurela-Pendra-Marwahi'),('CG','Janjgir-Champa'),('CG','Jashpur'),
  ('CG','Kabirdham'),('CG','Kanker'),('CG','Kondagaon'),('CG','Korba'),('CG','Koriya'),
  ('CG','Mahasamund'),('CG','Mungeli'),('CG','Narayanpur'),('CG','Raigarh'),('CG','Raipur'),
  ('CG','Rajnandgaon'),('CG','Sukma'),('CG','Surajpur'),('CG','Surguja'),('CG','Mohla-Manpur-Ambagarh Chowki'),
  ('CG','Manendragarh-Chirmiri-Bharatpur'),('CG','Sarangarh-Bilaigarh'),('CG','Sakti'),('CG','Khairagarh-Chhuikhadan-Gandai'),

  -- Goa (2)
  ('GA','North Goa'),('GA','South Goa'),

  -- Gujarat (33)
  ('GJ','Ahmedabad'),('GJ','Amreli'),('GJ','Anand'),('GJ','Aravalli'),('GJ','Banaskantha'),
  ('GJ','Bharuch'),('GJ','Bhavnagar'),('GJ','Botad'),('GJ','Chhota Udaipur'),('GJ','Dahod'),
  ('GJ','Dang'),('GJ','Devbhoomi Dwarka'),('GJ','Gandhinagar'),('GJ','Gir Somnath'),('GJ','Jamnagar'),
  ('GJ','Junagadh'),('GJ','Kheda'),('GJ','Kutch'),('GJ','Mahisagar'),('GJ','Mehsana'),
  ('GJ','Morbi'),('GJ','Narmada'),('GJ','Navsari'),('GJ','Panchmahal'),('GJ','Patan'),
  ('GJ','Porbandar'),('GJ','Rajkot'),('GJ','Sabarkantha'),('GJ','Surat'),('GJ','Surendranagar'),
  ('GJ','Tapi'),('GJ','Vadodara'),('GJ','Valsad'),

  -- Haryana (22)
  ('HR','Ambala'),('HR','Bhiwani'),('HR','Charkhi Dadri'),('HR','Faridabad'),('HR','Fatehabad'),
  ('HR','Gurugram'),('HR','Hisar'),('HR','Jhajjar'),('HR','Jind'),('HR','Kaithal'),
  ('HR','Karnal'),('HR','Kurukshetra'),('HR','Mahendragarh'),('HR','Nuh'),('HR','Palwal'),
  ('HR','Panchkula'),('HR','Panipat'),('HR','Rewari'),('HR','Rohtak'),('HR','Sirsa'),
  ('HR','Sonipat'),('HR','Yamunanagar'),

  -- Himachal Pradesh (12)
  ('HP','Bilaspur'),('HP','Chamba'),('HP','Hamirpur'),('HP','Kangra'),('HP','Kinnaur'),
  ('HP','Kullu'),('HP','Lahaul and Spiti'),('HP','Mandi'),('HP','Shimla'),('HP','Sirmaur'),
  ('HP','Solan'),('HP','Una'),

  -- Jharkhand (24)
  ('JH','Bokaro'),('JH','Chatra'),('JH','Deoghar'),('JH','Dhanbad'),('JH','Dumka'),
  ('JH','East Singhbhum'),('JH','Garhwa'),('JH','Giridih'),('JH','Godda'),('JH','Gumla'),
  ('JH','Hazaribagh'),('JH','Jamtara'),('JH','Khunti'),('JH','Koderma'),('JH','Latehar'),
  ('JH','Lohardaga'),('JH','Pakur'),('JH','Palamu'),('JH','Ramgarh'),('JH','Ranchi'),
  ('JH','Sahibganj'),('JH','Seraikela-Kharsawan'),('JH','Simdega'),('JH','West Singhbhum'),

  -- Karnataka (31)
  ('KA','Bagalkot'),('KA','Ballari'),('KA','Belagavi'),('KA','Bengaluru Rural'),('KA','Bengaluru Urban'),
  ('KA','Bidar'),('KA','Chamarajanagar'),('KA','Chikballapur'),('KA','Chikkamagaluru'),('KA','Chitradurga'),
  ('KA','Dakshina Kannada'),('KA','Davanagere'),('KA','Dharwad'),('KA','Gadag'),('KA','Hassan'),
  ('KA','Haveri'),('KA','Kalaburagi'),('KA','Kodagu'),('KA','Kolar'),('KA','Koppal'),
  ('KA','Mandya'),('KA','Mysuru'),('KA','Raichur'),('KA','Ramanagara'),('KA','Shivamogga'),
  ('KA','Tumakuru'),('KA','Udupi'),('KA','Uttara Kannada'),('KA','Vijayapura'),('KA','Yadgir'),
  ('KA','Vijayanagara'),

  -- Kerala (14)
  ('KL','Alappuzha'),('KL','Ernakulam'),('KL','Idukki'),('KL','Kannur'),('KL','Kasaragod'),
  ('KL','Kollam'),('KL','Kottayam'),('KL','Kozhikode'),('KL','Malappuram'),('KL','Palakkad'),
  ('KL','Pathanamthitta'),('KL','Thiruvananthapuram'),('KL','Thrissur'),('KL','Wayanad'),

  -- Madhya Pradesh (55)
  ('MP','Agar Malwa'),('MP','Alirajpur'),('MP','Anuppur'),('MP','Ashoknagar'),('MP','Balaghat'),
  ('MP','Barwani'),('MP','Betul'),('MP','Bhind'),('MP','Bhopal'),('MP','Burhanpur'),
  ('MP','Chachaura'),('MP','Chhatarpur'),('MP','Chhindwara'),('MP','Damoh'),('MP','Datia'),
  ('MP','Dewas'),('MP','Dhar'),('MP','Dindori'),('MP','Guna'),('MP','Gwalior'),
  ('MP','Harda'),('MP','Hoshangabad'),('MP','Indore'),('MP','Jabalpur'),('MP','Jhabua'),
  ('MP','Katni'),('MP','Khandwa'),('MP','Khargone'),('MP','Maihar'),('MP','Mandla'),
  ('MP','Mandsaur'),('MP','Morena'),('MP','Nagda'),('MP','Narsinghpur'),('MP','Neemuch'),
  ('MP','Niwari'),('MP','Panna'),('MP','Raisen'),('MP','Rajgarh'),('MP','Ratlam'),
  ('MP','Rewa'),('MP','Sagar'),('MP','Satna'),('MP','Sehore'),('MP','Seoni'),
  ('MP','Shahdol'),('MP','Shajapur'),('MP','Sheopur'),('MP','Shivpuri'),('MP','Sidhi'),
  ('MP','Singrauli'),('MP','Tikamgarh'),('MP','Ujjain'),('MP','Umaria'),('MP','Vidisha'),

  -- Maharashtra (36)
  ('MH','Ahmednagar'),('MH','Akola'),('MH','Amravati'),('MH','Aurangabad'),('MH','Beed'),
  ('MH','Bhandara'),('MH','Buldhana'),('MH','Chandrapur'),('MH','Dhule'),('MH','Gadchiroli'),
  ('MH','Gondia'),('MH','Hingoli'),('MH','Jalgaon'),('MH','Jalna'),('MH','Kolhapur'),
  ('MH','Latur'),('MH','Mumbai City'),('MH','Mumbai Suburban'),('MH','Nagpur'),('MH','Nanded'),
  ('MH','Nandurbar'),('MH','Nashik'),('MH','Osmanabad'),('MH','Palghar'),('MH','Parbhani'),
  ('MH','Pune'),('MH','Raigad'),('MH','Ratnagiri'),('MH','Sangli'),('MH','Satara'),
  ('MH','Sindhudurg'),('MH','Solapur'),('MH','Thane'),('MH','Wardha'),('MH','Washim'),
  ('MH','Yavatmal'),

  -- Manipur (16)
  ('MN','Bishnupur'),('MN','Chandel'),('MN','Churachandpur'),('MN','Imphal East'),('MN','Imphal West'),
  ('MN','Jiribam'),('MN','Kakching'),('MN','Kamjong'),('MN','Kangpokpi'),('MN','Noney'),
  ('MN','Pherzawl'),('MN','Senapati'),('MN','Tamenglong'),('MN','Tengnoupal'),('MN','Thoubal'),
  ('MN','Ukhrul'),

  -- Meghalaya (12)
  ('ML','East Garo Hills'),('ML','East Jaintia Hills'),('ML','East Khasi Hills'),('ML','North Garo Hills'),
  ('ML','Ri Bhoi'),('ML','South Garo Hills'),('ML','South West Garo Hills'),('ML','South West Khasi Hills'),
  ('ML','West Garo Hills'),('ML','West Jaintia Hills'),('ML','West Khasi Hills'),('ML','Eastern West Khasi Hills'),

  -- Mizoram (11)
  ('MZ','Aizawl'),('MZ','Champhai'),('MZ','Hnahthial'),('MZ','Khawzawl'),('MZ','Kolasib'),
  ('MZ','Lawngtlai'),('MZ','Lunglei'),('MZ','Mamit'),('MZ','Saiha'),('MZ','Saitual'),
  ('MZ','Serchhip'),

  -- Nagaland (16)
  ('NL','Chumukedima'),('NL','Dimapur'),('NL','Kiphire'),('NL','Kohima'),('NL','Longleng'),
  ('NL','Mokokchung'),('NL','Mon'),('NL','Niuland'),('NL','Noklak'),('NL','Peren'),
  ('NL','Phek'),('NL','Shamator'),('NL','Tseminyu'),('NL','Tuensang'),('NL','Wokha'),
  ('NL','Zunheboto'),

  -- Odisha (30)
  ('OD','Angul'),('OD','Balangir'),('OD','Balasore'),('OD','Bargarh'),('OD','Bhadrak'),
  ('OD','Boudh'),('OD','Cuttack'),('OD','Deogarh'),('OD','Dhenkanal'),('OD','Gajapati'),
  ('OD','Ganjam'),('OD','Jagatsinghpur'),('OD','Jajpur'),('OD','Jharsuguda'),('OD','Kalahandi'),
  ('OD','Kandhamal'),('OD','Kendrapara'),('OD','Kendujhar'),('OD','Khordha'),('OD','Koraput'),
  ('OD','Malkangiri'),('OD','Mayurbhanj'),('OD','Nabarangpur'),('OD','Nayagarh'),('OD','Nuapada'),
  ('OD','Puri'),('OD','Rayagada'),('OD','Sambalpur'),('OD','Subarnapur'),('OD','Sundargarh'),

  -- Punjab (23)
  ('PB','Amritsar'),('PB','Barnala'),('PB','Bathinda'),('PB','Faridkot'),('PB','Fatehgarh Sahib'),
  ('PB','Fazilka'),('PB','Ferozepur'),('PB','Gurdaspur'),('PB','Hoshiarpur'),('PB','Jalandhar'),
  ('PB','Kapurthala'),('PB','Ludhiana'),('PB','Malerkotla'),('PB','Mansa'),('PB','Moga'),
  ('PB','Mohali'),('PB','Muktsar'),('PB','Pathankot'),('PB','Patiala'),('PB','Rupnagar'),
  ('PB','Sangrur'),('PB','Shaheed Bhagat Singh Nagar'),('PB','Tarn Taran'),

  -- Rajasthan (50)
  ('RJ','Ajmer'),('RJ','Alwar'),('RJ','Anupgarh'),('RJ','Balotra'),('RJ','Banswara'),
  ('RJ','Baran'),('RJ','Barmer'),('RJ','Beawar'),('RJ','Bharatpur'),('RJ','Bhilwara'),
  ('RJ','Bikaner'),('RJ','Bundi'),('RJ','Chittorgarh'),('RJ','Churu'),('RJ','Dausa'),
  ('RJ','Deeg'),('RJ','Dholpur'),('RJ','Didwana-Kuchaman'),('RJ','Dudu'),('RJ','Dungarpur'),
  ('RJ','Gangapur City'),('RJ','Ganganagar'),('RJ','Hanumangarh'),('RJ','Jaipur'),('RJ','Jaipur Rural'),
  ('RJ','Jaisalmer'),('RJ','Jalore'),('RJ','Jhalawar'),('RJ','Jhunjhunu'),('RJ','Jodhpur'),
  ('RJ','Jodhpur Rural'),('RJ','Karauli'),('RJ','Kekri'),('RJ','Khairthal-Tijara'),('RJ','Kota'),
  ('RJ','Kotputli-Behror'),('RJ','Nagaur'),('RJ','Neem Ka Thana'),('RJ','Pali'),('RJ','Phalodi'),
  ('RJ','Pratapgarh'),('RJ','Rajsamand'),('RJ','Salumbar'),('RJ','Sanchore'),('RJ','Sawai Madhopur'),
  ('RJ','Sikar'),('RJ','Sirohi'),('RJ','Tonk'),('RJ','Udaipur'),('RJ','Shahpura'),

  -- Sikkim (6)
  ('SK','Gangtok'),('SK','Gyalshing'),('SK','Mangan'),('SK','Namchi'),('SK','Pakyong'),
  ('SK','Soreng'),

  -- Tamil Nadu (38)
  ('TN','Ariyalur'),('TN','Chengalpattu'),('TN','Chennai'),('TN','Coimbatore'),('TN','Cuddalore'),
  ('TN','Dharmapuri'),('TN','Dindigul'),('TN','Erode'),('TN','Kallakurichi'),('TN','Kanchipuram'),
  ('TN','Kanyakumari'),('TN','Karur'),('TN','Krishnagiri'),('TN','Madurai'),('TN','Mayiladuthurai'),
  ('TN','Nagapattinam'),('TN','Namakkal'),('TN','Nilgiris'),('TN','Perambalur'),('TN','Pudukkottai'),
  ('TN','Ramanathapuram'),('TN','Ranipet'),('TN','Salem'),('TN','Sivaganga'),('TN','Tenkasi'),
  ('TN','Thanjavur'),('TN','Theni'),('TN','Thoothukudi'),('TN','Tiruchirappalli'),('TN','Tirunelveli'),
  ('TN','Tirupathur'),('TN','Tiruppur'),('TN','Tiruvallur'),('TN','Tiruvannamalai'),('TN','Tiruvarur'),
  ('TN','Vellore'),('TN','Viluppuram'),('TN','Virudhunagar'),

  -- Telangana (33)
  ('TS','Adilabad'),('TS','Bhadradri Kothagudem'),('TS','Hanumakonda'),('TS','Hyderabad'),('TS','Jagtial'),
  ('TS','Jangaon'),('TS','Jayashankar Bhupalpally'),('TS','Jogulamba Gadwal'),('TS','Kamareddy'),
  ('TS','Karimnagar'),('TS','Khammam'),('TS','Komaram Bheem'),('TS','Mahabubabad'),('TS','Mahabubnagar'),
  ('TS','Mancherial'),('TS','Medak'),('TS','Medchal-Malkajgiri'),('TS','Mulugu'),('TS','Nagarkurnool'),
  ('TS','Nalgonda'),('TS','Narayanpet'),('TS','Nirmal'),('TS','Nizamabad'),('TS','Peddapalli'),
  ('TS','Rajanna Sircilla'),('TS','Ranga Reddy'),('TS','Sangareddy'),('TS','Siddipet'),('TS','Suryapet'),
  ('TS','Vikarabad'),('TS','Wanaparthy'),('TS','Warangal'),('TS','Yadadri Bhuvanagiri'),

  -- Tripura (8)
  ('TR','Dhalai'),('TR','Gomati'),('TR','Khowai'),('TR','North Tripura'),('TR','Sepahijala'),
  ('TR','South Tripura'),('TR','Unakoti'),('TR','West Tripura'),

  -- Uttar Pradesh (75)
  ('UP','Agra'),('UP','Aligarh'),('UP','Ambedkar Nagar'),('UP','Amethi'),('UP','Amroha'),
  ('UP','Auraiya'),('UP','Ayodhya'),('UP','Azamgarh'),('UP','Baghpat'),('UP','Bahraich'),
  ('UP','Ballia'),('UP','Balrampur'),('UP','Banda'),('UP','Barabanki'),('UP','Bareilly'),
  ('UP','Basti'),('UP','Bhadohi'),('UP','Bijnor'),('UP','Budaun'),('UP','Bulandshahr'),
  ('UP','Chandauli'),('UP','Chitrakoot'),('UP','Deoria'),('UP','Etah'),('UP','Etawah'),
  ('UP','Farrukhabad'),('UP','Fatehpur'),('UP','Firozabad'),('UP','Gautam Buddha Nagar'),('UP','Ghaziabad'),
  ('UP','Ghazipur'),('UP','Gonda'),('UP','Gorakhpur'),('UP','Hamirpur'),('UP','Hapur'),
  ('UP','Hardoi'),('UP','Hathras'),('UP','Jalaun'),('UP','Jaunpur'),('UP','Jhansi'),
  ('UP','Kannauj'),('UP','Kanpur Dehat'),('UP','Kanpur Nagar'),('UP','Kasganj'),('UP','Kaushambi'),
  ('UP','Kheri'),('UP','Kushinagar'),('UP','Lalitpur'),('UP','Lucknow'),('UP','Maharajganj'),
  ('UP','Mahoba'),('UP','Mainpuri'),('UP','Mathura'),('UP','Mau'),('UP','Meerut'),
  ('UP','Mirzapur'),('UP','Moradabad'),('UP','Muzaffarnagar'),('UP','Pilibhit'),('UP','Pratapgarh'),
  ('UP','Prayagraj'),('UP','Raebareli'),('UP','Rampur'),('UP','Saharanpur'),('UP','Sambhal'),
  ('UP','Sant Kabir Nagar'),('UP','Shahjahanpur'),('UP','Shamli'),('UP','Shravasti'),('UP','Siddharthnagar'),
  ('UP','Sitapur'),('UP','Sonbhadra'),('UP','Sultanpur'),('UP','Unnao'),('UP','Varanasi'),

  -- Uttarakhand (13)
  ('UK','Almora'),('UK','Bageshwar'),('UK','Chamoli'),('UK','Champawat'),('UK','Dehradun'),
  ('UK','Haridwar'),('UK','Nainital'),('UK','Pauri Garhwal'),('UK','Pithoragarh'),('UK','Rudraprayag'),
  ('UK','Tehri Garhwal'),('UK','Udham Singh Nagar'),('UK','Uttarkashi'),

  -- West Bengal (23)
  ('WB','Alipurduar'),('WB','Bankura'),('WB','Birbhum'),('WB','Cooch Behar'),('WB','Dakshin Dinajpur'),
  ('WB','Darjeeling'),('WB','Hooghly'),('WB','Howrah'),('WB','Jalpaiguri'),('WB','Jhargram'),
  ('WB','Kalimpong'),('WB','Kolkata'),('WB','Malda'),('WB','Murshidabad'),('WB','Nadia'),
  ('WB','North 24 Parganas'),('WB','Paschim Bardhaman'),('WB','Paschim Medinipur'),('WB','Purba Bardhaman'),
  ('WB','Purba Medinipur'),('WB','Purulia'),('WB','South 24 Parganas'),('WB','Uttar Dinajpur'),

  -- Andaman & Nicobar (3)
  ('AN','Nicobar'),('AN','North and Middle Andaman'),('AN','South Andaman'),

  -- Chandigarh (1)
  ('CH','Chandigarh'),

  -- Dadra & Nagar Haveli and Daman & Diu (3)
  ('DH','Dadra and Nagar Haveli'),('DH','Daman'),('DH','Diu'),

  -- Delhi (11)
  ('DL','Central Delhi'),('DL','East Delhi'),('DL','New Delhi'),('DL','North Delhi'),('DL','North East Delhi'),
  ('DL','North West Delhi'),('DL','Shahdara'),('DL','South Delhi'),('DL','South East Delhi'),
  ('DL','South West Delhi'),('DL','West Delhi'),

  -- Jammu & Kashmir (20)
  ('JK','Anantnag'),('JK','Bandipora'),('JK','Baramulla'),('JK','Budgam'),('JK','Doda'),
  ('JK','Ganderbal'),('JK','Jammu'),('JK','Kathua'),('JK','Kishtwar'),('JK','Kulgam'),
  ('JK','Kupwara'),('JK','Poonch'),('JK','Pulwama'),('JK','Rajouri'),('JK','Ramban'),
  ('JK','Reasi'),('JK','Samba'),('JK','Shopian'),('JK','Srinagar'),('JK','Udhampur'),

  -- Ladakh (2)
  ('LA','Kargil'),('LA','Leh'),

  -- Lakshadweep (1)
  ('LD','Lakshadweep'),

  -- Puducherry (4)
  ('PY','Karaikal'),('PY','Mahe'),('PY','Puducherry'),('PY','Yanam')
) as d(state_code, name) on d.state_code = s.code
where not exists (
  select 1 from public.districts existing
  where existing.state_id = s.id and existing.name = d.name
);

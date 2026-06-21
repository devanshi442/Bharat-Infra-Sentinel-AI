import json
import os
import random
import time
from datetime import datetime, timedelta, timezone
from app.database import Base, engine, SessionLocal, Issue, Contractor
from app.detection import severity_to_label
from app.prediction import predict_failure_probability, compute_priority_score
from app.routing import get_department

def seed_database():
    print("Starting database seeding process...")
    start_time = time.time()

    # 1. Recreate the database schema to ensure a clean slate
    print("Wiping existing database and recreating schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # 2. Load the national locations dataset
    locations_path = os.path.join(os.path.dirname(__file__), "app", "data", "india_locations.json")
    if not os.path.exists(locations_path):
        print(f"Error: Could not find locations file at {locations_path}")
        return

    with open(locations_path, "r") as f:
        locations_data = json.load(f)

    session = SessionLocal()
    
    # 3. Create Contractors
    print("Creating default contractors...")
    contractors = [
        Contractor(name="Alpha Build Co.", issues_assigned=100, issues_resolved=85, performance_score=85.0),
        Contractor(name="National Infra Ltd.", issues_assigned=150, issues_resolved=140, performance_score=93.3),
        Contractor(name="City Works Dept", issues_assigned=50, issues_resolved=20, performance_score=40.0),
        Contractor(name="Rapid Repairs Inc.", issues_assigned=75, issues_resolved=70, performance_score=93.3)
    ]
    session.add_all(contractors)
    session.commit()
    contractor_names = [c.name for c in contractors]

    # 4. Generate Issues
    print("Generating mock issues across the nation...")
    sample_types = ["pothole", "garbage", "waterlogging", "streetlight", "drainage", "other"]
    status_choices = ["reported", "in_progress", "resolved"]
    now = datetime.now(timezone.utc)
    
    # 200 Specific Civic Issue Cases (in picture that can be identified)
    # 20 native translations for every one of the 10 languages.
    extended_cases = [
        # ENGLISH (20 cases)
        ("pothole", "en", "Deep crater-like pothole in the middle of the intersection."),
        ("pothole", "en", "Multiple small potholes clustered together on the highway."),
        ("pothole", "en", "Sunken road surface near the manhole."),
        ("garbage", "en", "Overflowing municipal bin with trash spilling onto the street."),
        ("garbage", "en", "Illegal dumping of construction debris on the sidewalk."),
        ("garbage", "en", "Black trash bags piled up near the bus stop."),
        ("waterlogging", "en", "Flooded underpass preventing vehicle movement."),
        ("waterlogging", "en", "Stagnant pool of muddy water breeding mosquitoes."),
        ("waterlogging", "en", "Severe waterlogging up to knee height after a brief shower."),
        ("streetlight", "en", "Broken street light pole leaning dangerously."),
        ("streetlight", "en", "Flickering street light causing a distraction to drivers."),
        ("streetlight", "en", "Missing street light bulb leaving the alley in pitch dark."),
        ("drainage", "en", "Missing manhole cover on a busy road. Fatal hazard."),
        ("drainage", "en", "Broken or cracked manhole cover about to cave in."),
        ("drainage", "en", "Raw sewage overflowing onto the street, severe health hazard."),
        ("other", "en", "Broken footpath making it completely unsafe for pedestrians."),
        ("other", "en", "Uprooted large tree blocking two lanes of traffic."),
        ("other", "en", "Missing stop sign at a dangerous four-way intersection."),
        ("other", "en", "Faded zebra crossing leading to near-misses for pedestrians."),
        ("other", "en", "Rusty playground equipment posing a tetanus risk to children."),

        # HINDI (20 cases)
        ("pothole", "hi", "सड़क के बीच में बहुत गहरा गड्ढा है, दुर्घटना का खतरा है।"),
        ("pothole", "hi", "हाइवे पर छोटे-छोटे कई गड्ढे हैं।"),
        ("pothole", "hi", "सड़क धंस गई है, कृपया मरम्मत करें।"),
        ("garbage", "hi", "कूड़ेदान भर गया है और कचरा सड़क पर फैल रहा है।"),
        ("garbage", "hi", "फुटपाथ पर अवैध रूप से मलबा फेंका गया है।"),
        ("garbage", "hi", "सब्जी मंडी का सड़ा हुआ कचरा पड़ा है।"),
        ("waterlogging", "hi", "अंडरपास में पानी भर गया है, गाड़ियाँ नहीं जा सकतीं।"),
        ("waterlogging", "hi", "कल की बारिश के बाद भारी जलभराव हो गया है।"),
        ("waterlogging", "hi", "हाइवे पर जलभराव से लंबा जाम लग गया है।"),
        ("streetlight", "hi", "स्ट्रीटलाइट का खंभा खतरनाक तरीके से झुका हुआ है।"),
        ("streetlight", "hi", "पैदल पार पथ की लाइट खराब है।"),
        ("streetlight", "hi", "स्ट्रीटलाइट टूटी हुई है और रात में बहुत अंधेरा रहता है।"),
        ("drainage", "hi", "व्यस्त सड़क पर मैनहोल का ढक्कन गायब है।"),
        ("drainage", "hi", "खुली नाली का पानी सड़क पर बह रहा है।"),
        ("drainage", "hi", "खुली नाली में मरा हुआ कुत्ता पड़ा है।"),
        ("other", "hi", "फुटपाथ टूटा हुआ है, लोगों को सड़क पर चलना पड़ रहा है।"),
        ("other", "hi", "पेड़ गिरने से रास्ता पूरी तरह बंद है।"),
        ("other", "hi", "सार्वजनिक शौचालय का दरवाजा टूटा है और बहुत बदबू है।"),
        ("other", "hi", "हाइवे के साइनबोर्ड पर किसी ने पेंट कर दिया है।"),
        ("other", "hi", "पार्क में बेंच टूटी हुई है, लोहे की कीलें बाहर हैं।"),

        # BENGALI (20 cases)
        ("pothole", "bn", "রাস্তায় একটি বড় গর্ত আছে, দয়া করে মেরামত করুন।"),
        ("pothole", "bn", "মাঝ বরাবর লম্বা ফাটল, বিপদজনক অবস্থা।"),
        ("pothole", "bn", "রাস্তার পিচ সম্পূর্ণ উঠে গেছে।"),
        ("garbage", "bn", "৩ দিন ধরে আবর্জনা পরিষ্কার করা হয়নি।"),
        ("garbage", "bn", "কুকুর ডাস্টবিন থেকে আবর্জনা ছড়াচ্ছে।"),
        ("garbage", "bn", "রাস্তায় প্রচুর প্লাস্টিকের বোতল পড়ে আছে।"),
        ("waterlogging", "bn", "গতকাল বৃষ্টির পর প্রচুর জল জমেছে।"),
        ("waterlogging", "bn", "হাঁটার রাস্তা সম্পূর্ণ জলে ডুবে গেছে।"),
        ("waterlogging", "bn", "জলের নিচে গর্ত দেখা যাচ্ছে না, দুর্ঘটনা ঘটছে।"),
        ("streetlight", "bn", "রাস্তার আলো নষ্ট, রাতে খুব অন্ধকার থাকে।"),
        ("streetlight", "bn", "দিনের বেলায় রাস্তার আলো জ্বলছে, বিদ্যুৎ নষ্ট।"),
        ("streetlight", "bn", "রাস্তার আলোর কভার তারে ঝুলছে।"),
        ("drainage", "bn", "নর্দমা ভেঙে জল বাইরে রাস্তায় আসছে।"),
        ("drainage", "bn", "নর্দমায় প্রচুর কাদা জমে আছে, জল যাচ্ছে না।"),
        ("drainage", "bn", "রাস্তার মাঝখানে ম্যানহোল খোলা।"),
        ("other", "bn", "ফুটপাত ভাঙা, হাঁটতে খুব অসুবিধা হচ্ছে।"),
        ("other", "bn", "রাস্তার দাগ মুছে গেছে, রাতে গাড়ি চালাতে অসুবিধা।"),
        ("other", "bn", "পাহাড়ের বাঁকে রিফ্লেক্টর নেই, খুবই বিপদজনক।"),
        ("other", "bn", "বাস স্টপের শেডের কাঁচ ভেঙে পড়ে আছে।"),
        ("other", "bn", "পার্কের দোলনাগুলো জং ধরে ভেঙে গেছে।"),

        # MARATHI (20 cases)
        ("pothole", "mr", "रस्त्यावर अनेक छोटे खड्डे आहेत."),
        ("pothole", "mr", "रस्त्याला खूप मोठ्या भेगा पडल्या आहेत."),
        ("pothole", "mr", "रस्त्यावर खूप मोठा खड्डा आहे, कृपया दुरुस्त करा."),
        ("garbage", "mr", "३ दिवसांपासून कचरा उचललेला नाही."),
        ("garbage", "mr", "खुल्या कचराकुंडीत वैद्यकीय कचरा पडला आहे."),
        ("garbage", "mr", "पुठ्ठ्यांचे बॉक्स रस्त्यावर पडले आहेत."),
        ("waterlogging", "mr", "कालच्या पावसानंतर मोठ्या प्रमाणात पाणी साचले आहे."),
        ("waterlogging", "mr", "पार्किंगमध्ये पावसाचे पाणी भरले आहे."),
        ("waterlogging", "mr", "डोंगरावरून येणाऱ्या पाण्यामुळे रस्ता जलमय झाला आहे."),
        ("streetlight", "mr", "स्ट्रीट लाईट बंद आहे आणि रात्री खूप अंधार असतो."),
        ("streetlight", "mr", "इलेक्ट्रिक पोलवर उघड्या तारा आहेत, शॉक लागू शकतो."),
        ("streetlight", "mr", "हायवे चौकात पुरेसा प्रकाश नाही."),
        ("drainage", "mr", "गटारात रासायनिक पाणी सोडले जात आहे."),
        ("drainage", "mr", "सांडपाण्याची पाईप फुटली आहे."),
        ("drainage", "mr", "गटार तुंबले आहे आणि पाणी रस्त्यावर येत आहे."),
        ("other", "mr", "पदपथ तुटलेला आहे, चालणे अवघड झाले आहे."),
        ("other", "mr", "पादचारी पुलाच्या पायऱ्या तुटल्या आहेत."),
        ("other", "mr", "रेल्वे क्रॉसिंगजवळील कुंपण तुटले आहे."),
        ("other", "mr", "रस्त्यावर मोठे झाड पडले आहे."),
        ("other", "mr", "उघड्यावर बांधकाम साहित्य पडले आहे."),

        # TAMIL (20 cases)
        ("pothole", "ta", "சாலையில் பெரிய பள்ளம் உள்ளது, தயவுசெய்து சரிசெய்யவும்."),
        ("pothole", "ta", "சாலையின் ஓரம் கடுமையாக சேதமடைந்துள்ளது."),
        ("pothole", "ta", "நெடுஞ்சாலையில் தொடர்ச்சியாக பல பள்ளங்கள் உள்ளன."),
        ("garbage", "ta", "3 நாட்களாக குப்பை அள்ளப்படாமல் உள்ளது."),
        ("garbage", "ta", "குப்பைத் தொட்டி நிரம்பி வழிகிறது."),
        ("garbage", "ta", "காலி மனையில் பெயிண்ட் டப்பாக்கள் வீசப்பட்டுள்ளன."),
        ("waterlogging", "ta", "நேற்றைய மழையால் சாலையில் தண்ணீர் தேங்கியுள்ளது."),
        ("waterlogging", "ta", "கடைகளுக்குள் தண்ணீர் புகுந்துள்ளது."),
        ("waterlogging", "ta", "சரியற்ற சாலை அமைப்பால் நடுவில் தண்ணீர் தேங்குகிறது."),
        ("streetlight", "ta", "தெரு விளக்கு எரியவில்லை, இரவில் மிகவும் இருட்டாக உள்ளது."),
        ("streetlight", "ta", "பியூஸ் போனதால் முழு பகுதியும் இருளில் உள்ளது."),
        ("streetlight", "ta", "தற்காலிக வயர்கள் ஆபத்தான முறையில் தொங்குகின்றன."),
        ("drainage", "ta", "சாக்கடை நீர் சாலையில் பெருக்கெடுத்து ஓடுகிறது."),
        ("drainage", "ta", "சாக்கடை அடைத்துக்கொண்டு சாலையில் வழிகிறது."),
        ("drainage", "ta", "மரத்தின் வேர்கள் குழாயை உடைத்துவிட்டன."),
        ("other", "ta", "நடைபாதை உடைந்துள்ளது, நடந்து செல்ல கடினமாக உள்ளது."),
        ("other", "ta", "பொது குடிநீர் குழாய் உடைந்ததால் தண்ணீர் வீணாகிறது."),
        ("other", "ta", "பொது கடிகாரம் பல மாதங்களாக வேலை செய்யவில்லை."),
        ("other", "ta", "பஸ் நிறுத்த நிழற்குடை உடைக்கப்பட்டுள்ளது."),
        ("other", "ta", "சாலையின் குறுக்கே பெரிய மரம் சாய்ந்து கிடக்கிறது."),

        # GUJARATI (20 cases)
        ("pothole", "gu", "રસ્તા પર મોટો ખાડો છે, કૃપા કરીને સમારકામ કરો."),
        ("pothole", "gu", "ખાડામાં પાણી ભરાઈ ગયું છે, વાહનચાલકો માટે જોખમી છે."),
        ("pothole", "gu", "કામચલાઉ રિપેરિંગ ફરી તૂટી ગયું છે."),
        ("garbage", "gu", "૩ દિવસથી કચરો ઉપાડવામાં આવ્યો નથી."),
        ("garbage", "gu", "રસ્તા પર કચરો સળગાવવામાં આવી રહ્યો છે."),
        ("garbage", "gu", "જૂનું ફર્નિચર રસ્તા પર છોડી દેવાયું છે."),
        ("waterlogging", "gu", "વરસાદ પછી રસ્તા પર પાણી ભરાઈ ગયું છે."),
        ("waterlogging", "gu", "પાણી ભરાવાને કારણે કાર બંધ પડી ગઈ છે."),
        ("waterlogging", "gu", "પીવાના પાણીની પાઇપલાઇન લીક થવાથી ખાબોચિયું ભરાયું છે."),
        ("streetlight", "gu", "સ્ટ્રીટ લાઈટ બંધ છે, રાત્રે અંધારું રહે છે."),
        ("streetlight", "gu", "કાટ લાગેલો થાંભલો પડવાની તૈયારીમાં છે."),
        ("streetlight", "gu", "સોલાર પેનલ ચોરાઈ ગઈ છે."),
        ("drainage", "gu", "ગટરનું પાણી રસ્તા પર વહી રહ્યું છે."),
        ("drainage", "gu", "ગટરની દુર્ગંધ ખૂબ જ ખરાબ છે."),
        ("drainage", "gu", "ગટરનું પાણી પીવાના પાણી સાથે ભળી રહ્યું છે."),
        ("other", "gu", "ફૂટપાથ તૂટેલી છે, ચાલવામાં તકલીફ પડે છે."),
        ("other", "gu", "વ્યસ્ત ચાર રસ્તા પર રખડતા ઢોર બેઠા છે."),
        ("other", "gu", "સેફ્ટી બેરિયરમાંથી લોખંડનો સળિયો બહાર આવી રહ્યો છે."),
        ("other", "gu", "ટ્રાફિક સિગ્નલ બરાબર કામ કરી રહ્યું નથી."),
        ("other", "gu", "રસ્તા પર મોટા પથ્થર પડેલા છે."),

        # TELUGU (20 cases)
        ("pothole", "te", "రహదారిపై పెద్ద గుంత ఉంది, దయచేసి మరమ్మతు చేయండి."),
        ("pothole", "te", "రహదారిపై భారీ గుంత ఏర్పడింది."),
        ("pothole", "te", "స్పీడ్ బ్రేకర్ విరిగిపోయింది, ప్రమాదకరం."),
        ("garbage", "te", "మూడు రోజులుగా చెత్త తీయలేదు. దుర్వాసన వస్తోంది."),
        ("garbage", "te", "పబ్లిక్ పార్క్‌లో చెత్త చెదారం ఎక్కువగా ఉంది."),
        ("garbage", "te", "ప్లాస్టిక్ కవర్లు గాలికి ఎగురుతున్నాయి."),
        ("waterlogging", "te", "వర్షం వల్ల రోడ్డుపై నీరు నిలిచిపోయింది."),
        ("waterlogging", "te", "పిల్లలు మురికి నీటిలో నడవాల్సి వస్తోంది."),
        ("waterlogging", "te", "కాలువ పొంగి ఇళ్లలోకి నీరు వస్తోంది."),
        ("streetlight", "te", "వీధి దీపం వెలగడం లేదు, రాత్రిపూట చాలా చీకటిగా ఉంది."),
        ("streetlight", "te", "చెట్టు కొమ్మలు వీధి దీపానికి అడ్డంగా ఉన్నాయి."),
        ("streetlight", "te", "వీధి దీపాలు పగలు కూడా వెలుగుతున్నాయి."),
        ("drainage", "te", "మురుగు కాలువ పొంగి రోడ్డుపై ప్రవహిస్తోంది."),
        ("drainage", "te", "పాఠశాల పక్కన ఉన్న కాలువలో దోమలు ఎక్కువగా ఉన్నాయి."),
        ("drainage", "te", "హోటల్ వాళ్లు నూనెను కాలువలో పోస్తున్నారు."),
        ("other", "te", "ఫుట్‌పాత్ విరిగిపోయింది, నడవడానికి ఇబ్బందిగా ఉంది."),
        ("other", "te", "జీబ్రా క్రాసింగ్ సరిగ్గా కనిపించడం లేదు."),
        ("other", "te", "స్టేడియం వలలో చనిపోయిన పక్షి ఇరుక్కుపోయింది."),
        ("other", "te", "పార్కులో పిల్లలు ఆడుకునే పరికరాలు పాడయ్యాయి."),
        ("other", "te", "రహదారి మధ్యలో పెద్ద చెట్టు పడిపోయింది."),

        # KANNADA (20 cases)
        ("pothole", "kn", "ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ, ದಯವಿಟ್ಟು ಸರಿಪಡಿಸಿ."),
        ("pothole", "kn", "ಗುಂಡಿಯ ಸುತ್ತಲೂ ಜಲ್ಲಿಕಲ್ಲು ಹರಡಿದೆ."),
        ("pothole", "kn", "ರಸ್ತೆಯ ಸವೆತ ಉಂಟಾಗಿದೆ, ವಾಹನ ಚಲಾಯಿಸಲು ಕಷ್ಟ."),
        ("garbage", "kn", "ರಸ್ತೆಯಲ್ಲಿ ತುಂಬಾ ಕಸ ಬಿದ್ದಿದೆ, ದಯವಿಟ್ಟು ಸ್ವಚ್ಛಗೊಳಿಸಿ."),
        ("garbage", "kn", "ನದಿ ತೀರದಲ್ಲಿ ರಾಸಾಯನಿಕ ಡ್ರಮ್‌ಗಳನ್ನು ಬಿಡಲಾಗಿದೆ."),
        ("garbage", "kn", "ಇ-ತ್ಯಾಜ್ಯವನ್ನು ಸಾಮಾನ್ಯ ಕಸದ ತೊಟ್ಟಿಯಲ್ಲಿ ಹಾಕಲಾಗಿದೆ."),
        ("waterlogging", "kn", "ಮಳೆಯಿಂದಾಗಿ ರಸ್ತೆಯಲ್ಲಿ ನೀರು ನಿಂತಿದೆ."),
        ("waterlogging", "kn", "ನಿಂತ ನೀರಿನಿಂದ ಕೆಟ್ಟ ವಾಸನೆ ಬರುತ್ತಿದೆ."),
        ("waterlogging", "kn", "ಚರಂಡಿ ಕಟ್ಟಿಕೊಂಡು ನೀರು ರಸ್ತೆಗೆ ಬಂದಿದೆ."),
        ("streetlight", "kn", "ಬೀದಿ ದೀಪ ಕೆಟ್ಟುಹೋಗಿದೆ, ರಾತ್ರಿ ತುಂಬಾ ಕತ್ತಲಿರುತ್ತದೆ."),
        ("streetlight", "kn", "ವೃತ್ತದಲ್ಲಿರುವ ದೊಡ್ಡ ದೀಪ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ."),
        ("streetlight", "kn", "ಲಾರಿ ಡಿಕ್ಕಿ ಹೊಡೆದು ಕಂಬ ಬಾಗಿದೆ."),
        ("drainage", "kn", "ಚರಂಡಿ ತುಂಬಿ ನೀರು ರಸ್ತೆಗೆ ಹರಿಯುತ್ತಿದೆ."),
        ("drainage", "kn", "ಚರಂಡಿ ಮುಚ್ಚಳ ಕಳುವಾಗಿದೆ."),
        ("drainage", "kn", "ಹೊಸ ರಸ್ತೆಯಲ್ಲಿ ಚರಂಡಿ ವ್ಯವಸ್ಥೆ ಇಲ್ಲ."),
        ("other", "kn", "ಕಾಲುದಾರಿ ಒಡೆದುಹೋಗಿದೆ, ನಡೆಯಲು ಕಷ್ಟವಾಗುತ್ತಿದೆ."),
        ("other", "kn", "ಅಕ್ರಮ ಜಾಹೀರಾತು ಫಲಕವು ಟ್ರಾಫಿಕ್ ಸಿಗ್ನಲ್ ಅನ್ನು ಮರೆಮಾಡಿದೆ."),
        ("other", "kn", "ಸೈಕಲ್ ಟ್ರ್ಯಾಕ್‌ನಲ್ಲಿ ಗಾಜಿನ ಚೂರುಗಳು ಬಿದ್ದಿವೆ."),
        ("other", "kn", "ರಸ್ತೆಯಲ್ಲಿ ಅಡ್ಡಲಾಗಿ ಮರ ಬಿದ್ದಿದೆ."),
        ("other", "kn", "ಬಸ್ ನಿಲ್ದಾಣದ ಛಾವಣಿ ಒಡೆದುಹೋಗಿದೆ."),

        # MALAYALAM (20 cases)
        ("pothole", "ml", "വലിയ കുഴി കാരണം ഗതാഗതക്കുരുക്ക് ഉണ്ടാകുന്നു."),
        ("pothole", "ml", "ട്രാക്ടർ കാരണം വഴിയിൽ വലിയ കുഴിയുണ്ടായി."),
        ("pothole", "ml", "കുഴി കാരണം ടയറുകൾക്ക് കേടുപാടുകൾ സംഭവിക്കുന്നു."),
        ("garbage", "ml", "വഴിയരികിൽ മാലിന്യം കുന്നുകൂടിക്കിടക്കുന്നു."),
        ("garbage", "ml", "പഴയ ടയറുകൾ കൊതുകുകൾക്ക് കാരണമാകുന്നു."),
        ("garbage", "ml", "പ്ലാസ്റ്റിക് മാലിന്യം വഴിയിൽ നിറഞ്ഞിരിക്കുന്നു."),
        ("waterlogging", "ml", "മഴ കാരണം വെള്ളക്കെട്ട് രൂപപ്പെട്ടിരിക്കുന്നു."),
        ("waterlogging", "ml", "പൊട്ടിയ വാട്ടർ പൈപ്പിൽ നിന്ന് വെള്ളം ഒഴുകുന്നു."),
        ("waterlogging", "ml", "മതിലിൽ നിന്ന് വെള്ളം ഊർന്നിറങ്ങുന്നു."),
        ("streetlight", "ml", "തെരുവുവിളക്ക് കത്തുന്നില്ല, രാത്രി വളരെ ഇരുട്ടാണ്."),
        ("streetlight", "ml", "കുട്ടികൾക്ക് എത്തുന്ന ഉയരത്തിൽ തുറന്ന ജംഗ്ഷൻ ബോക്സ്."),
        ("streetlight", "ml", "ഷോർട്ട് സർക്യൂട്ട് കാരണം പോളിൽ തീപിടിച്ചു."),
        ("drainage", "ml", "ഓട നിറഞ്ഞൊഴുകി വെള്ളം റോഡിലേക്ക് വരുന്നു."),
        ("drainage", "ml", "ഓടയിലെ വെള്ളം വീടുകളിലേക്ക് കയറുന്നു."),
        ("drainage", "ml", "വലിയ മാലിന്യങ്ങൾ പൈപ്പിൽ കുടുങ്ങുന്നു."),
        ("other", "ml", "നടപ്പാത തകർന്നിരിക്കുന്നു, നടക്കാൻ ബുദ്ധിമുട്ടാണ്."),
        ("other", "ml", "കേബിൾ ടിവി വയറുകൾ റോഡിലേക്ക് താഴ്ന്നു കിടക്കുന്നു."),
        ("other", "ml", "മണ്ണിടിച്ചിൽ കാരണം റോഡ് തടസ്സപ്പെട്ടു."),
        ("other", "ml", "ട്രാഫിക് ലൈറ്റ് പ്രവർത്തിക്കുന്നില്ല."),
        ("other", "ml", "പൊതു കക്കൂസ് വൃത്തിഹീനമാണ്."),

        # PUNJABI (20 cases)
        ("pothole", "pa", "ਸੜਕ ਤੇ ਬਹੁਤ ਵੱਡਾ ਟੋਇਆ ਹੈ, ਕਿਰਪਾ ਕਰਕੇ ਠੀਕ ਕਰੋ।"),
        ("pothole", "pa", "ਗਰਮੀ ਨਾਲ ਸੜਕ ਦਾ ਅਸਫਾਲਟ ਖਰਾਬ ਹੋ ਗਿਆ ਹੈ।"),
        ("pothole", "pa", "ਟੋਏ ਕਾਰਨ ਗੱਡੀਆਂ ਦਾ ਨੁਕਸਾਨ ਹੋ ਰਿਹਾ ਹੈ।"),
        ("garbage", "pa", "ਕੂੜਾ ੩ ਦਿਨਾਂ ਤੋਂ ਚੁੱਕਿਆ ਨਹੀਂ ਗਿਆ।"),
        ("garbage", "pa", "ਸਾਈਕਲ ਲੇਨ ਤੇ ਕੱਚ ਖਿਲਰਿਆ ਹੋਇਆ ਹੈ।"),
        ("garbage", "pa", "ਕੂੜੇਦਾਨ ਭਰਨ ਕਾਰਨ ਕੂੜਾ ਬਾਹਰ ਡਿੱਗ ਰਿਹਾ ਹੈ।"),
        ("waterlogging", "pa", "ਮੀਂਹ ਤੋਂ ਬਾਅਦ ਸੜਕ ਤੇ ਪਾਣੀ ਭਰ ਗਿਆ ਹੈ।"),
        ("waterlogging", "pa", "ਪਾਣੀ ਖੜ੍ਹਨ ਕਾਰਨ ਕਾਈ ਜੰਮ ਗਈ ਹੈ।"),
        ("waterlogging", "pa", "ਪਾਣੀ ਵਿੱਚ ਮੱਛਰ ਪੈਦਾ ਹੋ ਰਹੇ ਹਨ।"),
        ("streetlight", "pa", "ਸਟਰੀਟ ਲਾਈਟ ਖਰਾਬ ਹੈ, ਰਾਤ ਨੂੰ ਬਹੁਤ ਹਨੇਰਾ ਹੁੰਦਾ ਹੈ।"),
        ("streetlight", "pa", "ਟ੍ਰਾਂਸਫਾਰਮਰ ਵਿੱਚੋਂ ਚੰਗਿਆੜੀਆਂ ਨਿਕਲ ਰਹੀਆਂ ਹਨ।"),
        ("streetlight", "pa", "ਖੰਭੇ ਤੇ ਤਾਰਾਂ ਖੁੱਲ੍ਹੀਆਂ ਪਈਆਂ ਹਨ।"),
        ("drainage", "pa", "ਨਾਲੀ ਦਾ ਪਾਣੀ ਸੜਕ ਤੇ ਆ ਰਿਹਾ ਹੈ।"),
        ("drainage", "pa", "ਨਾਲੀ ਦੀਆਂ ਸਲੈਬਾਂ ਟੁੱਟ ਗਈਆਂ ਹਨ।"),
        ("drainage", "pa", "ਮੈਨਹੋਲ ਦਾ ਢੱਕਣ ਟੁੱਟਿਆ ਹੋਇਆ ਹੈ।"),
        ("other", "pa", "ਫੁੱਟਪਾਥ ਟੁੱਟਿਆ ਹੋਇਆ ਹੈ।"),
        ("other", "pa", "ਪਬਲਿਕ ਪਾਰਕ ਦਾ ਗੇਟ ਟੁੱਟਾ ਹੋਇਆ ਹੈ।"),
        ("other", "pa", "ਕਰੇਨ ਚੌਰਾਹੇ ਦੇ ਬਹੁਤ ਨੇੜੇ ਖੜ੍ਹੀ ਹੈ।"),
        ("other", "pa", "ਸਾਈਨਬੋਰਡ ਟੁੱਟਿਆ ਪਿਆ ਹੈ।"),
        ("other", "pa", "ਸੜਕ ਦੇ ਵਿਚਕਾਰ ਪਸ਼ੂ ਬੈਠੇ ਹਨ।")
    ]
    
    issues_to_insert = []

    # Per-type placeholder images (SVG placeholders saved in uploads/)
    # Generated by generate_seed_images.py — original graphics, no copyright.
    BEFORE_IMAGES = {
        "pothole":      "/uploads/seed_pothole_before.jpg",
        "garbage":      "/uploads/seed_garbage_before.jpg",
        "waterlogging": "/uploads/seed_waterlogging_before.jpg",
        "streetlight":  "/uploads/seed_streetlight_before.jpg",
        "drainage":     "/uploads/seed_drainage_before.jpg",
        "other":        "/uploads/seed_other_before.jpg",
    }
    AFTER_IMAGES = {
        "pothole":      "/uploads/seed_pothole_after.jpg",
        "garbage":      "/uploads/seed_garbage_after.jpg",
        "waterlogging": "/uploads/seed_waterlogging_after.jpg",
        "streetlight":  "/uploads/seed_streetlight_after.jpg",
        "drainage":     "/uploads/seed_drainage_after.jpg",
        "other":        "/uploads/seed_other_after.jpg",
    }

    for state, cities in locations_data.items():
        for city, info in cities.items():
            # Scale up significantly: between 300 and 800 issues per city
            num_issues = random.randint(300, 800)
            wards = info.get("wards", [])
            if not wards:
                continue

                
            for _ in range(num_issues):
                ward_info = random.choice(wards)
                ward_name = ward_info["name"]
                
                lat = random.uniform(ward_info["min_lat"], ward_info["max_lat"])
                lng = random.uniform(ward_info["min_lng"], ward_info["max_lng"])
                
                issue_type = random.choice(sample_types)
                severity = round(random.uniform(20, 95), 1)
                label = severity_to_label(severity)
                
                # Random created_at within the last 90 days
                days_ago = random.randint(0, 90)
                hours_ago = random.randint(0, 23)
                created_at = now - timedelta(days=days_ago, hours=hours_ago)
                
                fail_prob = predict_failure_probability(issue_type, severity, created_at)
                priority = compute_priority_score(severity, fail_prob, age_days=days_ago, report_count=1)
                
                status = random.choice(status_choices)
                assigned_contractor = random.choice(contractor_names) if status != "reported" else None
                
                # Pick a random specific case
                case_type, lang, note_text = random.choice(extended_cases)
                
                # Override the generic random issue_type with the specific case type
                issue_type = case_type
                
                # Simulate realistic completion times if resolved
                updated_at = created_at
                if status != "reported":
                    updated_at = created_at + timedelta(days=random.randint(1, min(14, 90 - days_ago + 1)))

                # Pick type-specific before/after images
                before_img = BEFORE_IMAGES.get(issue_type, "/uploads/seed_other_before.jpg")
                after_img = AFTER_IMAGES.get(issue_type, "/uploads/seed_other_after.jpg") if status != "reported" else None

                issue = Issue(
                    image_path=before_img,
                    after_image_path=after_img,
                    issue_type=issue_type,
                    confidence=round(random.uniform(0.6, 0.95), 2),
                    severity_score=severity,
                    severity_label=label,
                    latitude=lat,
                    longitude=lng,
                    state=state,
                    city=city,
                    ward=ward_name,
                    address=f"Simulated location in {ward_name}",
                    status=status,
                    priority_score=priority,
                    assigned_department=get_department(issue_type),
                    contractor=assigned_contractor,
                    failure_probability_30d=fail_prob,
                    report_count=1,
                    created_at=created_at,
                    updated_at=updated_at,
                    original_language=lang,
                    reporter_note=note_text
                )
                issues_to_insert.append(issue)

    # 5. Bulk Insert
    print(f"Preparing bulk insert: {len(issues_to_insert)} issues to insert.")
    print(f"Batch size: {batch_size}. Using SQLAlchemy session.bulk_save_objects for batch insert.")
    print(f"Contractors created: {len(contractors)}. Cities: {sum(len(c) for c in locations_data.values())}. Wards total: {sum(len(c['wards']) for c in locations_data.values())}")
    batch_size = 1000
    for i in range(0, len(issues_to_insert), batch_size):
        batch = issues_to_insert[i:i + batch_size]
        session.bulk_save_objects(batch)
        print(f"  -> Inserted batch {i//batch_size + 1}/{(len(issues_to_insert) - 1)//batch_size + 1}")
    
    session.commit()
    session.close()
    
    end_time = time.time()
    elapsed = end_time - start_time
    print(f"\n--- Seeding Complete ---")
    print(f"Total Issues Generated: {len(issues_to_insert)}")
    print(f"Execution Time: {elapsed:.2f} seconds")
    print(f"Cities Populated: {sum(len(c) for c in locations_data.values())}")
    print("Database is now ready for the national-scale demo.")

if __name__ == "__main__":
    seed_database()

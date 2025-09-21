import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface AdhkarItem {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  count?: number;
  completed?: boolean;
}

interface AdhkarCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  adhkar: AdhkarItem[];
}

// Comprehensive adhkar data based on authentic Islamic sources
const ADHKAR_DATA: AdhkarCategory[] = [
  {
    id: 'morning',
    name: 'Morning Adhkar',
    icon: '🌅',
    description: 'Remembrance for the morning (after Fajr until sunrise)',
    adhkar: [
      {
        id: 'morning-1',
        arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
        transliteration: 'Asbahna wa asbahal-mulku lillahi, walhamdu lillahi, la ilaha illa Allah wahdahu la shareeka lah',
        translation: 'We have reached the morning and with it Allah\'s dominion. Praise be to Allah. There is no god but Allah alone, with no partner.',
        count: 1
      },
      {
        id: 'morning-2',
        arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
        transliteration: 'Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana \'abduka, wa ana ala ahdika wa wa\'dika mastata\'tu',
        translation: 'O Allah, You are my Lord, none has the right to be worshipped except You. You created me and I am Your servant, and I am faithful to my covenant and my promise as much as I can.',
        count: 1
      },
      {
        id: 'morning-3',
        arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
        transliteration: 'Bismillahil-ladhi la yadhurru ma\'as-mihi shay\'un fil-ardhi wa la fis-sama\'i wa huwas-samee\'ul-\'aleem',
        translation: 'In the name of Allah with whose name nothing is harmed on earth nor in the heavens, and He is the All-Hearing, the All-Knowing.',
        count: 3
      },
      {
        id: 'morning-4',
        arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
        transliteration: 'A\'udhu bi-kalimatillahit-tammati min sharri ma khalaq',
        translation: 'I seek refuge in Allah\'s perfect words from the evil He has created.',
        count: 3
      },
      {
        id: 'morning-5',
        arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ',
        transliteration: 'Allahumma inni a\'udhu bika min-al-hammi wal-hazan, wa a\'udhu bika min-al-\'ajzi wal-kasal',
        translation: 'O Allah, I seek refuge in You from anxiety and sorrow, weakness and laziness.',
        count: 1
      },
      {
        id: 'morning-6',
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
        transliteration: 'Allahumma inni as\'aluka al-\'afiyata fi\'d-dunya wal-akhirah',
        translation: 'O Allah, I ask You for well-being in this world and the next.',
        count: 1
      },
      {
        id: 'morning-7',
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
        transliteration: 'Subhan Allah wa bihamdih',
        translation: 'Glory be to Allah and praise Him.',
        count: 100
      },
      {
        id: 'morning-8',
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        transliteration: 'La ilaha illa Allah wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu wa huwa ala kulli shay\'in qadeer',
        translation: 'There is no god but Allah alone, with no partner. His is the dominion and His is the praise, and He is able to do all things.',
        count: 100
      },
      {
        id: 'morning-9',
        arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
        transliteration: 'Allahumma bika asbahna wa bika amsayna, wa bika nahya wa bika namutu wa ilaykan-nushur',
        translation: 'O Allah, by You we have reached the morning and by You we reach the evening. By You we live and by You we die, and to You is the resurrection.',
        count: 1
      },
      {
        id: 'morning-10',
        arabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
        transliteration: 'Astaghfirullaha-l\'azeem al-ladhi la ilaha illa huwa-l-hayyu-l-qayyumu wa atubu ilayh',
        translation: 'I seek forgiveness from Allah the Mighty, whom there is no god but He, the Living, the Eternal, and I repent to Him.',
        count: 3
      },
      {
        id: 'morning-11',
        arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ الصَّمَدُ * لَمْ يَلِدْ وَلَمْ يُولَدْ * وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
        transliteration: 'Qul huwa Allahu ahad. Allahu as-samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.',
        translation: 'Say: He is Allah, the One! Allah, the Eternal, Absolute; He begets not, nor is He begotten; And there is none like unto Him. (Surah Al-Ikhlas)',
        count: 3
      },
      {
        id: 'morning-12',
        arabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ * مِن شَرِّ مَا خَلَقَ * وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ * وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ * وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
        transliteration: 'Qul a\'udhu bi rabbi-l-falaq. Min sharri ma khalaq. Wa min sharri ghasiqin idha waqab. Wa min sharri-n-naffathati fi-l-\'uqad. Wa min sharri hasidin idha hasad.',
        translation: 'Say: I seek refuge with the Lord of the Daybreak, From the mischief of created things; From the mischief of Darkness as it overspreads; From the mischief of those who practise secret arts; And from the mischief of the envious one as he practises envy. (Surah Al-Falaq)',
        count: 3
      },
      {
        id: 'morning-13',
        arabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ * مَلِكِ النَّاسِ * إِلَهِ النَّاسِ * مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ * الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ * مِنَ الْجِنَّةِ وَ النَّاسِ',
        transliteration: 'Qul a\'udhu bi rabbi-n-nas. Maliki-n-nas. Ilahi-n-nas. Min sharri-l-waswasi-l-khannas. Al-ladhi yuwaswisu fi suduri-n-nas. Min al-jinnati wa-n-nas.',
        translation: 'Say: I seek refuge with the Lord and Cherisher of Mankind, The King (or Ruler) of Mankind, The god (or judge) of Mankind,- From the mischief of the Whisperer (of Evil), who withdraws (after his whisper),- (The same) who whispers into the hearts of Mankind,- Among Jinns and among men. (Surah An-Nas)',
        count: 3
      },
      {
        id: 'morning-14',
        arabic: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ',
        transliteration: 'Allahumma \'afini fi badani, Allahumma \'afini fi sam\'i, Allahumma \'afini fi basari, la ilaha illa ant',
        translation: 'O Allah, grant me well-being in my body, O Allah, grant me well-being in my hearing, O Allah, grant me well-being in my sight, there is no god but You.',
        count: 3
      },
      {
        id: 'morning-15',
        arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ',
        transliteration: 'Allahumma inni a\'udhu bika min al-kufri wa-l-faqr, wa a\'udhu bika min \'adhab al-qabr, la ilaha illa ant',
        translation: 'O Allah, I seek refuge in You from disbelief and poverty, and I seek refuge in You from the punishment of the grave, there is no god but You.',
        count: 3
      },
      {
        id: 'morning-16',
        arabic: 'اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ',
        transliteration: 'Allahu la ilaha illa huwa-l-hayyu-l-qayyum, la ta\'khudhuhu sinatun wa la nawm, lahu ma fi\'s-samawati wa ma fi\'l-ard, man dha-l-ladhi yashfa\'u \'indahu illa bi-idhnih, ya\'lamu ma bayna aydihim wa ma khalfahum, wa la yuhituna bi-shay\'in min \'ilmihi illa bima sha\'a, wasi\'a kursiyyuhu\'s-samawati wa\'l-ard, wa la ya\'uduhu hifzuhuma wa huwa-l-\'aliyyu-l-\'azim',
        translation: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great. (Ayatul Kursi)',
        count: 1
      }
    ]
  },
  {
    id: 'evening',
    name: 'Evening Adhkar',
    icon: '🌆',
    description: 'Remembrance for the evening (after Asr until Maghrib)',
    adhkar: [
      {
        id: 'evening-1',
        arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
        transliteration: 'Amsayna wa amsal-mulku lillahi, walhamdu lillahi, la ilaha illa Allah wahdahu la shareeka lah',
        translation: 'We have reached the evening and with it Allah\'s dominion. Praise be to Allah. There is no god but Allah alone, with no partner.',
        count: 1
      },
      {
        id: 'evening-2',
        arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
        transliteration: 'Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana \'abduka, wa ana ala ahdika wa wa\'dika mastata\'tu',
        translation: 'O Allah, You are my Lord, none has the right to be worshipped except You. You created me and I am Your servant, and I am faithful to my covenant and my promise as much as I can.',
        count: 1
      },
      {
        id: 'evening-3',
        arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
        transliteration: 'A\'udhu bi-kalimatillahit-tammati min sharri ma khalaq',
        translation: 'I seek refuge in Allah\'s perfect words from the evil He has created.',
        count: 3
      },
      {
        id: 'evening-4',
        arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ',
        transliteration: 'Allahumma inni a\'udhu bika min-al-hammi wal-hazan, wa a\'udhu bika min-al-\'ajzi wal-kasal',
        translation: 'O Allah, I seek refuge in You from anxiety and sorrow, weakness and laziness.',
        count: 1
      },
      {
        id: 'evening-5',
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
        transliteration: 'Allahumma inni as\'aluka al-\'afiyata fi\'d-dunya wal-akhirah',
        translation: 'O Allah, I ask You for well-being in this world and the next.',
        count: 1
      },
      {
        id: 'evening-6',
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
        transliteration: 'Subhan Allah wa bihamdih',
        translation: 'Glory be to Allah and praise Him.',
        count: 100
      },
      {
        id: 'evening-7',
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        transliteration: 'La ilaha illa Allah wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu wa huwa ala kulli shay\'in qadeer',
        translation: 'There is no god but Allah alone, with no partner. His is the dominion and His is the praise, and He is able to do all things.',
        count: 10
      },
      {
        id: 'evening-8',
        arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ',
        transliteration: 'Allahumma bika amsayna wa bika asbahna, wa bika nahya wa bika namutu wa ilaykal-maseer',
        translation: 'O Allah, by You we reach the evening and by You we reach the morning. By You we live and by You we die, and to You is our final destination.',
        count: 1
      },
      {
        id: 'evening-9',
        arabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
        transliteration: 'Astaghfirullaha-l\'azeem al-ladhi la ilaha illa huwa-l-hayyu-l-qayyumu wa atubu ilayh',
        translation: 'I seek forgiveness from Allah the Mighty, whom there is no god but He, the Living, the Eternal, and I repent to Him.',
        count: 3
      },
      {
        id: 'evening-10',
        arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
        transliteration: 'Allahumma a\'inni ala dhikrika wa shukrika wa husni \'ibadatik',
        translation: 'O Allah, help me remember You, to be grateful to You, and to worship You in an excellent manner.',
        count: 1
      },
      {
        id: 'evening-11',
        arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ الصَّمَدُ * لَمْ يَلِدْ وَلَمْ يُولَدْ * وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
        transliteration: 'Qul huwa Allahu ahad. Allahu as-samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.',
        translation: 'Say: He is Allah, the One! Allah, the Eternal, Absolute; He begets not, nor is He begotten; And there is none like unto Him. (Surah Al-Ikhlas)',
        count: 3
      },
      {
        id: 'evening-12',
        arabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ * مِن شَرِّ مَا خَلَقَ * وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ * وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ * وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
        transliteration: 'Qul a\'udhu bi rabbi-l-falaq. Min sharri ma khalaq. Wa min sharri ghasiqin idha waqab. Wa min sharri-n-naffathati fi-l-\'uqad. Wa min sharri hasidin idha hasad.',
        translation: 'Say: I seek refuge with the Lord of the Daybreak, From the mischief of created things; From the mischief of Darkness as it overspreads; From the mischief of those who practise secret arts; And from the mischief of the envious one as he practises envy. (Surah Al-Falaq)',
        count: 3
      },
      {
        id: 'evening-13',
        arabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ * مَلِكِ النَّاسِ * إِلَهِ النَّاسِ * مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ * الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ * مِنَ الْجِنَّةِ وَ النَّاسِ',
        transliteration: 'Qul a\'udhu bi rabbi-n-nas. Maliki-n-nas. Ilahi-n-nas. Min sharri-l-waswasi-l-khannas. Al-ladhi yuwaswisu fi suduri-n-nas. Min al-jinnati wa-n-nas.',
        translation: 'Say: I seek refuge with the Lord and Cherisher of Mankind, The King (or Ruler) of Mankind, The god (or judge) of Mankind,- From the mischief of the Whisperer (of Evil), who withdraws (after his whisper),- (The same) who whispers into the hearts of Mankind,- Among Jinns and among men. (Surah An-Nas)',
        count: 3
      },
      {
        id: 'evening-14',
        arabic: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ',
        transliteration: 'Allahumma \'afini fi badani, Allahumma \'afini fi sam\'i, Allahumma \'afini fi basari, la ilaha illa ant',
        translation: 'O Allah, grant me well-being in my body, O Allah, grant me well-being in my hearing, O Allah, grant me well-being in my sight, there is no god but You.',
        count: 3
      },
      {
        id: 'evening-15',
        arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ',
        transliteration: 'Allahumma inni a\'udhu bika min al-kufri wa-l-faqr, wa a\'udhu bika min \'adhab al-qabr, la ilaha illa ant',
        translation: 'O Allah, I seek refuge in You from disbelief and poverty, and I seek refuge in You from the punishment of the grave, there is no god but You.',
        count: 3
      },
      {
        id: 'evening-16',
        arabic: 'اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ',
        transliteration: 'Allahu la ilaha illa huwa-l-hayyu-l-qayyum, la ta\'khudhuhu sinatun wa la nawm, lahu ma fi\'s-samawati wa ma fi\'l-ard, man dha-l-ladhi yashfa\'u \'indahu illa bi-idhnih, ya\'lamu ma bayna aydihim wa ma khalfahum, wa la yuhituna bi-shay\'in min \'ilmihi illa bima sha\'a, wasi\'a kursiyyuhu\'s-samawati wa\'l-ard, wa la ya\'uduhu hifzuhuma wa huwa-l-\'aliyyu-l-\'azim',
        translation: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great. (Ayatul Kursi)',
        count: 1
      }
    ]
  },
  {
    id: 'sleep',
    name: 'Before Sleep',
    icon: '🌙',
    description: 'Remembrance before going to sleep',
    adhkar: [
      {
        id: 'sleep-1',
        arabic: 'اللَّهُمَّ بِاسْمِكَ أَمُوتُ وَأَحْيَا',
        transliteration: 'Allahumma bismika amutu wa ahya',
        translation: 'O Allah, in Your name I die and I live.',
        count: 1
      },
      {
        id: 'sleep-2',
        arabic: 'اللَّهُمَّ إِنِّي أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ',
        transliteration: 'Allahumma inni aslamtu nafsi ilayka, wa fawwadtu amri ilayk',
        translation: 'O Allah, I surrender my soul unto You, and I entrust my affairs unto You.',
        count: 1
      },
      {
        id: 'sleep-3',
        arabic: 'اللَّهُمَّ أَعُوذُ بِوَجْهِكَ الْكَرِيمِ وَكَلِمَاتِكَ التَّامَّاتِ مِنْ شَرِّ مَا أَنْتَ آخِذٌ بِنَاصِيَتِهِ',
        transliteration: 'Allahumma a\'udhu bi-wajhikal-kareem wa kalimatika-t-tammati min sharri ma anta akhidhun bi-nasiyatih',
        translation: 'O Allah, I seek refuge in Your noble face and Your perfect words from the evil of that which You have taken by the forelock.',
        count: 1
      },
      {
        id: 'sleep-4',
        arabic: 'سُبْحَانَ اللَّهِ',
        transliteration: 'Subhan Allah',
        translation: 'Glory be to Allah.',
        count: 33
      },
      {
        id: 'sleep-5',
        arabic: 'الْحَمْدُ لِلَّهِ',
        transliteration: 'Alhamdu lillah',
        translation: 'Praise be to Allah.',
        count: 33
      },
      {
        id: 'sleep-6',
        arabic: 'اللَّهُ أَكْبَرُ',
        transliteration: 'Allahu Akbar',
        translation: 'Allah is the Greatest.',
        count: 34
      },
      {
        id: 'sleep-7',
        arabic: 'أَسْتَغْفِرُ اللَّهَ',
        transliteration: 'Astaghfirullah',
        translation: 'I seek forgiveness from Allah.',
        count: 3
      },
      {
        id: 'sleep-8',
        arabic: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
        transliteration: 'Allahumma qini \'adhabaka yawma tab\'athu \'ibadak',
        translation: 'O Allah, protect me from Your punishment on the Day You resurrect Your servants.',
        count: 3
      },
      {
        id: 'sleep-9',
        arabic: 'اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ',
        transliteration: 'Allahu la ilaha illa huwa-l-hayyu-l-qayyum, la ta\'khudhuhu sinatun wa la nawm, lahu ma fi\'s-samawati wa ma fi\'l-ard, man dha-l-ladhi yashfa\'u \'indahu illa bi-idhnih, ya\'lamu ma bayna aydihim wa ma khalfahum, wa la yuhituna bi-shay\'in min \'ilmihi illa bima sha\'a, wasi\'a kursiyyuhu\'s-samawati wa\'l-ard, wa la ya\'uduhu hifzuhuma wa huwa-l-\'aliyyu-l-\'azim',
        translation: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great. (Ayatul Kursi)',
        count: 1
      }
    ]
  },
  {
    id: 'palestine',
    name: 'Dua for Palestine/Gaza',
    icon: '🇵🇸',
    description: 'Supplications for our brothers and sisters in Palestine',
    adhkar: [
      {
        id: 'palestine-1',
        arabic: 'اللَّهُمَّ انصُرْ إِخْوَانَنَا فِي فِلَسْطِينَ وَغَزَّةَ وَفِي كُلِّ مَكَانٍ',
        transliteration: 'Allahumma-nsur ikhwanana fi Filastin wa Ghazza wa fi kulli makan',
        translation: 'O Allah, help our brothers and sisters in Palestine and Gaza and in every place.',
        count: 1
      },
      {
        id: 'palestine-2',
        arabic: 'اللَّهُمَّ ارْحَمْ شُهَدَاءَ فِلَسْطِينَ وَاغْفِرْ لَهُمْ وَأَدْخِلْهُمُ الْجَنَّةَ',
        transliteration: 'Allahumma-rham shuhada\' Filastin wa-ghfir lahum wa adkhilhum al-jannah',
        translation: 'O Allah, have mercy on the martyrs of Palestine, forgive them, and admit them to Paradise.',
        count: 1
      },
      {
        id: 'palestine-3',
        arabic: 'اللَّهُمَّ اشْفِ جَرْحَى فِلَسْطِينَ وَعَافِ مَرْضَاهُمْ وَفَرِّجْ عَنْ مُبْتَلَاهُمْ',
        transliteration: 'Allahumma-shfi jarha Filastin wa \'afi mardahum wa farrij \'an mubtalahum',
        translation: 'O Allah, heal the wounded of Palestine, cure their sick, and relieve those who are afflicted.',
        count: 1
      },
      {
        id: 'palestine-4',
        arabic: 'اللَّهُمَّ اكْشِفْ الْغُمَّةَ عَنْ أَهْلِ فِلَسْطِينَ وَغَزَّةَ وَفَرِّجْ عَنْهُمْ',
        transliteration: 'Allahumma-kshif al-ghummata \'an ahli Filastin wa Ghazza wa farrij \'anhum',
        translation: 'O Allah, remove the distress from the people of Palestine and Gaza and grant them relief.',
        count: 1
      },
      {
        id: 'palestine-5',
        arabic: 'اللَّهُمَّ اجْعَلْ لَهُمْ مِنْ كُلِّ هَمٍّ فَرَجًا وَمِنْ كُلِّ ضِيقٍ مَخْرَجًا',
        transliteration: 'Allahumma-j\'al lahum min kulli hammin farajan wa min kulli diqin makhrajan',
        translation: 'O Allah, grant them relief from every worry and a way out from every difficulty.',
        count: 1
      },
      {
        id: 'palestine-6',
        arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
        transliteration: 'Rabbana atina fi\'d-dunya hasanatan wa fi\'l-akhirati hasanatan wa qina \'adhab an-nar',
        translation: 'Our Lord, give us good in this world and good in the next world, and save us from the punishment of the Fire.',
        count: 7
      },
      {
        id: 'palestine-7',
        arabic: 'اللَّهُمَّ أَصْلِحْ أَحْوَالَ الْمُسْلِمِينَ فِي فِلَسْطِينَ وَفِي كُلِّ مَكَانٍ',
        transliteration: 'Allahumma aslih ahwal al-muslimin fi Filastin wa fi kulli makan',
        translation: 'O Allah, improve the conditions of the Muslims in Palestine and everywhere.',
        count: 1
      },
      {
        id: 'palestine-8',
        arabic: 'اللَّهُمَّ عَلَيْكَ بِالظَّالِمِينَ الْمُعْتَدِينَ وَاجْعَلْ تَدْبِيرَهُمْ تَدْمِيرَهُمْ',
        transliteration: 'Allahumma \'alayka bi\'z-zalimin al-mu\'tadin wa-j\'al tadbirahum tadmirahum',
        translation: 'O Allah, deal with the wrongdoing oppressors and make their plotting their own destruction.',
        count: 1
      },
      {
        id: 'palestine-9',
        arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ نِعْمَ الْمَوْلَى وَنِعْمَ النَّصِيرُ',
        transliteration: 'Hasbuna Allah wa ni\'ma al-wakil, ni\'ma al-mawla wa ni\'ma an-nasir',
        translation: 'Allah is sufficient for us and He is the best disposer of affairs, the best protector and the best helper.',
        count: 3
      },
      {
        id: 'palestine-10',
        arabic: 'اللَّهُمَّ اجْمَعْ كَلِمَةَ الْمُسْلِمِينَ وَوَحِّدْ صُفُوفَهُمْ وَانْصُرْهُمْ عَلَى عَدُوِّهِمْ',
        transliteration: 'Allahumma-jma\' kalimata al-muslimin wa wahhid sufufahum wa-nsurhum \'ala \'aduwwihim',
        translation: 'O Allah, unite the word of the Muslims, unify their ranks, and grant them victory over their enemies.',
        count: 1
      }
    ]
  }
];

const AdhkarView: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('morning');
  const [completedAdhkar, setCompletedAdhkar] = useState<Set<string>>(new Set());
  const [adhkarProgress, setAdhkarProgress] = useState<Record<string, number>>({});

  const currentCategory = ADHKAR_DATA.find(cat => cat.id === selectedCategory);

  const handleAdhkarComplete = (adhkarId: string) => {
    const adhkar = currentCategory?.adhkar.find(a => a.id === adhkarId);
    if (!adhkar) return;

    const currentCount = adhkarProgress[adhkarId] || 0;
    const maxCount = adhkar.count || 1;

    if (currentCount < maxCount) {
      const newCount = currentCount + 1;
      setAdhkarProgress(prev => ({
        ...prev,
        [adhkarId]: newCount
      }));

      if (newCount >= maxCount) {
        setCompletedAdhkar(prev => new Set([...prev, adhkarId]));
      }
    }
  };

  const resetCategoryProgress = () => {
    if (!currentCategory) return;

    const categoryAdhkarIds = currentCategory.adhkar.map(a => a.id);
    setCompletedAdhkar(prev => {
      const newSet = new Set(prev);
      categoryAdhkarIds.forEach(id => newSet.delete(id));
      return newSet;
    });

    setAdhkarProgress(prev => {
      const newProgress = { ...prev };
      categoryAdhkarIds.forEach(id => delete newProgress[id]);
      return newProgress;
    });
  };

  const getCategoryProgress = (categoryId: string) => {
    const category = ADHKAR_DATA.find(c => c.id === categoryId);
    if (!category) return 0;

    const completed = category.adhkar.filter(adhkar =>
      completedAdhkar.has(adhkar.id)
    ).length;

    return Math.round((completed / category.adhkar.length) * 100);
  };

  const getCurrentProgress = (adhkar: AdhkarItem) => {
    const current = adhkarProgress[adhkar.id] || 0;
    const max = adhkar.count || 1;
    return { current, max };
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-pink-900">
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row">
          {/* Categories Sidebar - Mobile Horizontal Scroll */}
          <div className="lg:w-80 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b lg:border-r lg:border-b-0 border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
            {/* Mobile Header */}
            <div className="p-4 lg:p-6 border-b border-slate-200/50 dark:border-slate-700/50 lg:block">
              <h2 className="text-lg lg:text-xl font-bold text-slate-800 dark:text-slate-200 mb-1 lg:mb-2">
                Adhkar Categories
              </h2>
              <p className="text-xs lg:text-sm text-slate-600 dark:text-slate-400">
                Daily remembrance of Allah
              </p>
            </div>

            {/* Categories - Horizontal scroll on mobile, vertical on desktop */}
            <div className="lg:p-4">
              <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible space-x-3 lg:space-x-0 lg:space-y-3 p-4 lg:p-0 scrollbar-hide">
                {ADHKAR_DATA.map(category => {
                  const progress = getCategoryProgress(category.id);
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex-shrink-0 lg:w-full text-left p-3 lg:p-4 rounded-xl transition-all min-w-[200px] lg:min-w-0 ${
                        selectedCategory === category.id
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                          : 'bg-slate-100/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-600/80'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-xl lg:text-2xl">{category.icon}</span>
                        <span className="font-medium text-sm lg:text-base">{category.name}</span>
                      </div>
                      <p className={`text-xs lg:text-sm hidden lg:block ${
                        selectedCategory === category.id
                          ? 'text-white/80'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {category.description}
                      </p>
                      <div className="mt-2 lg:mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs ${
                            selectedCategory === category.id
                              ? 'text-white/70'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            Progress
                          </span>
                          <span className={`text-xs font-medium ${
                            selectedCategory === category.id
                              ? 'text-white'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}>
                            {progress}%
                          </span>
                        </div>
                        <div className={`w-full h-1.5 lg:h-2 rounded-full ${
                          selectedCategory === category.id
                            ? 'bg-white/20'
                            : 'bg-slate-200 dark:bg-slate-600'
                        }`}>
                          <div
                            className={`h-full rounded-full transition-all ${
                              selectedCategory === category.id
                                ? 'bg-white'
                                : 'bg-purple-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 lg:p-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-2 lg:space-y-0">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-200 mb-1">
                    {currentCategory?.name}
                  </h1>
                  <p className="text-sm lg:text-base text-slate-600 dark:text-slate-400">
                    {currentCategory?.description}
                  </p>
                </div>
                <button
                  onClick={resetCategoryProgress}
                  className="self-start lg:self-auto px-3 lg:px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm lg:text-base"
                >
                  Reset Progress
                </button>
              </div>
            </div>

            {/* Adhkar Cards */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
              {currentCategory?.adhkar.map(adhkar => {
                const { current, max } = getCurrentProgress(adhkar);
                const isCompleted = completedAdhkar.has(adhkar.id);

                return (
                  <div
                    key={adhkar.id}
                    className={`p-4 lg:p-6 rounded-xl transition-all ${
                      isCompleted
                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-700'
                        : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                    } border backdrop-blur-xl`}
                  >
                    <div className="space-y-3 lg:space-y-4">
                      {/* Arabic Text */}
                      <div className="text-right">
                        <p className="text-lg lg:text-2xl leading-relaxed text-slate-800 dark:text-slate-200 font-arabic">
                          {adhkar.arabic}
                        </p>
                      </div>

                      {/* Transliteration */}
                      <div>
                        <p className="text-sm lg:text-lg italic text-slate-600 dark:text-slate-400">
                          {adhkar.transliteration}
                        </p>
                      </div>

                      {/* Translation */}
                      <div>
                        <p className="text-sm lg:text-base text-slate-700 dark:text-slate-300">
                          {adhkar.translation}
                        </p>
                      </div>

                      {/* Count and Action */}
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-3 lg:space-y-0 pt-3 lg:pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-center space-x-3 lg:space-x-4">
                          <span className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">
                            {current} / {max} times
                          </span>
                          <div className="flex-1 lg:w-24 h-2 bg-slate-200 dark:bg-slate-600 rounded-full">
                            <div
                              className="h-full bg-purple-500 rounded-full transition-all"
                              style={{ width: `${(current / max) * 100}%` }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleAdhkarComplete(adhkar.id)}
                          disabled={isCompleted}
                          className={`w-full lg:w-auto px-4 lg:px-6 py-2 rounded-lg font-medium transition-all text-sm lg:text-base ${
                            isCompleted
                              ? 'bg-green-500 text-white cursor-not-allowed'
                              : 'bg-purple-500 text-white hover:bg-purple-600 active:scale-95'
                          }`}
                        >
                          {isCompleted ? '✓ Completed' : 'Recite'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdhkarView;
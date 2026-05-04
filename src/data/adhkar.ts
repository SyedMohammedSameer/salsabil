export interface AdhkarItem {
  id: string
  arabic: string
  transliteration?: string
  translation: string
  count: number
  source?: string
}

export type AdhkarSet = 'morning' | 'evening' | 'after_prayer'

export const MORNING_ADHKAR: AdhkarItem[] = [
  {
    id: 'morning-ayat-kursi',
    arabic:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
    translation:
      'Ayat al-Kursi — Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence.',
    count: 1,
    source: 'Quran 2:255',
  },
  {
    id: 'morning-ikhlas',
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
    translation:
      'Surat Al-Ikhlas — Say: He is Allah, One; Allah, the Eternal Refuge; He neither begets nor is born; nor is there to Him any equivalent.',
    count: 3,
    source: 'Quran 112',
  },
  {
    id: 'morning-falaq',
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
    translation:
      'Surat Al-Falaq — Say: I seek refuge in the Lord of daybreak from the evil of that which He created.',
    count: 3,
    source: 'Quran 113',
  },
  {
    id: 'morning-nas',
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ',
    translation:
      'Surat An-Nas — Say: I seek refuge in the Lord of mankind, the Sovereign of mankind, the God of mankind.',
    count: 3,
    source: 'Quran 114',
  },
  {
    id: 'morning-asbahna',
    arabic:
      'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'Asbahna wa asbahal-mulku lillah...',
    translation:
      'We have reached the morning and at this very time all sovereignty belongs to Allah. All praise is due to Allah. None has the right to be worshipped except Allah, alone, without any partner.',
    count: 1,
    source: 'Abu Dawud',
  },
  {
    id: 'morning-allahumma-bika',
    arabic:
      'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
    transliteration: 'Allahumma bika asbahna, wa bika amsayna...',
    translation:
      'O Allah, by Your leave we have reached the morning and by Your leave we have reached the evening, by Your leave we live and die and unto You is our resurrection.',
    count: 1,
    source: 'Tirmidhi',
  },
  {
    id: 'morning-sayyid-istighfar',
    arabic:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    transliteration: 'Allahumma anta rabbi la ilaha illa anta...',
    translation:
      'Sayyid al-Istighfar — O Allah, You are my Lord. None has the right to be worshipped except You. You created me and I am Your servant, and I abide to Your covenant and promise as best I can.',
    count: 1,
    source: 'Bukhari',
  },
  {
    id: 'morning-afiyah',
    arabic:
      'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ',
    transliteration: 'Allahumma afini fi badani...',
    translation:
      'O Allah, grant me health in my body. O Allah, grant me health in my hearing. O Allah, grant me health in my sight. None has the right to be worshipped except You.',
    count: 3,
    source: 'Abu Dawud',
  },
  {
    id: 'morning-subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    transliteration: 'SubhanAllahi wa bihamdihi',
    translation: 'Glory and praise be to Allah.',
    count: 100,
    source: 'Bukhari & Muslim',
  },
  {
    id: 'morning-kalimah',
    arabic:
      'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'La ilaha illallah wahdahu la sharika lah...',
    translation:
      'None has the right to be worshipped except Allah, alone, without any partner. To Him belongs all sovereignty and praise, and He is over all things competent.',
    count: 10,
    source: 'Bukhari & Muslim',
  },
]

export const EVENING_ADHKAR: AdhkarItem[] = [
  {
    id: 'evening-ayat-kursi',
    arabic:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
    translation:
      'Ayat al-Kursi — Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence.',
    count: 1,
    source: 'Quran 2:255',
  },
  {
    id: 'evening-ikhlas',
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
    translation: 'Surat Al-Ikhlas — Say: He is Allah, One.',
    count: 3,
    source: 'Quran 112',
  },
  {
    id: 'evening-falaq',
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ',
    translation: 'Surat Al-Falaq — Say: I seek refuge in the Lord of daybreak.',
    count: 3,
    source: 'Quran 113',
  },
  {
    id: 'evening-nas',
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ',
    translation: 'Surat An-Nas — Say: I seek refuge in the Lord of mankind.',
    count: 3,
    source: 'Quran 114',
  },
  {
    id: 'evening-amsayna',
    arabic:
      'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'Amsayna wa amsal-mulku lillah...',
    translation:
      'We have reached the evening and at this very time all sovereignty belongs to Allah. All praise is due to Allah.',
    count: 1,
    source: 'Abu Dawud',
  },
  {
    id: 'evening-allahumma-bika',
    arabic:
      'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
    transliteration: 'Allahumma bika amsayna...',
    translation:
      'O Allah, by Your leave we have reached the evening and by Your leave we have reached the morning, by Your leave we live and die and unto You is our return.',
    count: 1,
    source: 'Tirmidhi',
  },
  {
    id: 'evening-sayyid-istighfar',
    arabic:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    translation:
      'Sayyid al-Istighfar — O Allah, You are my Lord. None has the right to be worshipped except You.',
    count: 1,
    source: 'Bukhari',
  },
  {
    id: 'evening-protection',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
    transliteration: "Allahumma inni as'alukal-afwa wal-afiyah...",
    translation:
      'O Allah, I ask You for forgiveness and well-being in this world and in the Hereafter.',
    count: 1,
    source: 'Abu Dawud & Ibn Majah',
  },
  {
    id: 'evening-subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    transliteration: 'SubhanAllahi wa bihamdihi',
    translation: 'Glory and praise be to Allah.',
    count: 100,
    source: 'Bukhari & Muslim',
  },
  {
    id: 'evening-hasbi',
    arabic:
      'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ، وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    transliteration: 'Hasbiyallahu la ilaha illa huwa, alayhi tawakkaltu...',
    translation:
      'Allah is sufficient for me. There is no deity except Him. I have placed my trust in Him, and He is the Lord of the Mighty Throne.',
    count: 7,
    source: 'Abu Dawud',
  },
]

export const AFTER_PRAYER_ADHKAR: AdhkarItem[] = [
  {
    id: 'after-astaghfirullah',
    arabic: 'أَسْتَغْفِرُ اللَّهَ',
    transliteration: 'Astaghfirullah',
    translation: 'I seek forgiveness from Allah.',
    count: 3,
    source: 'Muslim',
  },
  {
    id: 'after-allahumma-salam',
    arabic:
      'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ ذَا الْجَلَالِ وَالْإِكْرَامِ',
    transliteration: 'Allahumma antas-salamu wa minkas-salam...',
    translation:
      'O Allah, You are As-Salam and from You is all peace. Blessed are You, O Possessor of majesty and honour.',
    count: 1,
    source: 'Muslim',
  },
  {
    id: 'after-ayat-kursi',
    arabic:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ',
    translation:
      'Ayat al-Kursi — Allah! There is no deity except Him, the Ever-Living, the Sustainer.',
    count: 1,
    source: 'Quran 2:255 — Bukhari',
  },
  {
    id: 'after-subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: 'SubhanAllah',
    translation: 'Glory be to Allah.',
    count: 33,
    source: 'Muslim',
  },
  {
    id: 'after-alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alhamdulillah',
    translation: 'All praise is due to Allah.',
    count: 33,
    source: 'Muslim',
  },
  {
    id: 'after-allahuakbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    translation: 'Allah is the Greatest.',
    count: 34,
    source: 'Muslim',
  },
  {
    id: 'after-la-ilaha',
    arabic:
      'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'La ilaha illallah wahdahu la sharika lah...',
    translation:
      'None has the right to be worshipped except Allah, alone, without any partner. To Him belongs all sovereignty and praise, and He is over all things competent.',
    count: 1,
    source: 'Muslim',
  },
]

export const ADHKAR_SETS: Record<AdhkarSet, AdhkarItem[]> = {
  morning: MORNING_ADHKAR,
  evening: EVENING_ADHKAR,
  after_prayer: AFTER_PRAYER_ADHKAR,
}

export const ADHKAR_SET_LABELS: Record<AdhkarSet, string> = {
  morning: 'Morning',
  evening: 'Evening',
  after_prayer: 'After Prayer',
}

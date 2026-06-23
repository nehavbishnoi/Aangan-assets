// Comprehensive set of family relationship labels — pan-Indian, including
// Hindi, Tamil, and other common Indian-family terms. Grouped for the picker.
export const RELATION_GROUPS = [
  {
    group: 'Core',
    items: ['Self', 'Spouse', 'Partner', 'Father', 'Mother', 'Son', 'Daughter'],
    rel_type: 'core',
  },
  {
    group: 'Siblings',
    items: [
      'Brother', 'Sister',
      'Elder brother (Bhaiya / Bhai)', 'Younger brother (Chhota bhai)',
      'Elder sister (Didi / Behen)', 'Younger sister (Chhoti behen)',
      'Cousin brother', 'Cousin sister', 'Step brother', 'Step sister',
      'Brother (Anna - Tamil)', 'Younger brother (Thambi - Tamil)',
      'Sister (Akka - Tamil)', 'Younger sister (Thangai - Tamil)',
    ],
    rel_type: 'sibling',
  },
  {
    group: 'Paternal grandparents',
    items: ['Paternal grandfather (Dada / Dadu)', 'Paternal grandmother (Dadi)',
            'Paternal grandfather (Thatha - Tamil)', 'Paternal grandmother (Patti - Tamil)'],
    rel_type: 'parent',
  },
  {
    group: 'Maternal grandparents',
    items: ['Maternal grandfather (Nana / Nanu)', 'Maternal grandmother (Nani)',
            'Maternal grandfather (Thatha - Tamil)', 'Maternal grandmother (Patti - Tamil)'],
    rel_type: 'parent',
  },
  {
    group: 'Paternal uncles & aunts',
    items: [
      "Father's elder brother (Bade Papa / Taya / Periappa)",
      "Wife of Bade Papa (Badi Mummy / Tayi / Periamma)",
      "Father's younger brother (Chacha / Chittappa)",
      "Wife of Chacha (Chachi / Chithi)",
      "Father's sister (Bua / Phuphi / Athai)",
      "Husband of Bua (Phupha / Maamaa)",
    ],
    rel_type: 'extended',
  },
  {
    group: 'Maternal uncles & aunts',
    items: [
      "Mother's brother (Mama / Maamaa)", "Wife of Mama (Mami / Maami)",
      "Mother's elder sister (Badi Mausi / Periamma)",
      "Husband of Mausi (Mausa)",
      "Mother's younger sister (Chhoti Mausi / Chithi)",
    ],
    rel_type: 'extended',
  },
  {
    group: 'Cousins',
    items: [
      'Cousin brother (Cousin Bhai)', 'Cousin sister (Cousin Behen)',
      "Mama's son (Mama's bhai)", "Mama's daughter (Mama's behen)",
      "Chacha's son", "Chacha's daughter",
      "Bua's son", "Bua's daughter",
      "Mausi's son", "Mausi's daughter",
    ],
    rel_type: 'extended',
  },
  {
    group: 'In-laws',
    items: [
      'Father-in-law (Sasur / Mama)', 'Mother-in-law (Saas / Atthai-Maami)',
      'Brother-in-law (Devar / Jeth / Saala / Bhaava)',
      'Sister-in-law (Bhabhi / Nanad / Sali / Maithuni)',
      'Son-in-law (Damaad / Marumagan)',
      'Daughter-in-law (Bahu / Marumagal)',
    ],
    rel_type: 'extended',
  },
  {
    group: 'Children & grandchildren',
    items: ['Son', 'Daughter', 'Step son', 'Step daughter',
            'Grandson', 'Granddaughter', "Daughter's son (Dohita)", "Daughter's daughter (Dohiti)",
            "Son's son (Pota)", "Son's daughter (Poti)"],
    rel_type: 'child',
  },
  {
    group: 'Other',
    items: ['Godfather', 'Godmother', 'Family friend', 'Mentor', 'Other'],
    rel_type: 'extended',
  },
];

export const RELATION_FLAT = RELATION_GROUPS.flatMap((g) => g.items);

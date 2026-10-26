/* Published audition dates supplied by the School for 2027. No booking is created. */
function createSchoolAuditions(jsx, jsxs, french) {
  const dates = [
    ['2027-03-15', '15 mars', '15 March', '15:00'],
    ['2027-04-10', '10 avril', '10 April', '13:00'],
    ['2027-04-24', '24 avril', '24 April', '13:00'],
    ['2027-05-15', '15 mai', '15 May', '13:00'],
    ['2027-05-29', '29 mai', '29 May', '13:00'],
    ['2027-06-12', '12 juin', '12 June', '13:00'],
    ['2027-06-26', '26 juin', '26 June', '13:00'],
    ['2027-07-10', '10 juillet', '10 July', '13:00'],
  ];
  return jsxs('div', {className: 'school-auditions', children: [
    jsx('h4', {children: french ? 'Auditions 2027' : '2027 auditions'}),
    jsx('p', {className: 'school-auditions__intro', children: french
      ? 'Choisis une date pour préparer ta candidature. Horaires de Paris.'
      : 'Choose a date to prepare your application. All times are Paris time.'}),
    jsx('ul', {className: 'school-auditions__dates', children: dates.map(([date, fr, en, time]) =>
      jsxs('li', {children: [
        jsx('time', {dateTime: date + 'T' + time, children: french ? fr : en}),
        jsx('span', {children: time === '15:00' ? (french ? '15 h' : '3 pm') : (french ? '13 h' : '1 pm')}),
      ]}, date))}),
    jsx('p', {className: 'school-auditions__note', children: french
      ? 'L’équipe confirme ton inscription à l’audition après réception de ta demande.'
      : 'The team confirms your audition registration after receiving your enquiry.'}),
  ]});
}

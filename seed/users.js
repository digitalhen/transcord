db.dropDatabase();

const users = [
  {name: 'Henry Williams', email: 'recording@digitalhen.com', phoneNumber: '+14156694559'},
  {name: 'Terry Chapman', email: 'blahblah@digitalhen.com', phoneNumber: '+12124442796'},
  {name: 'Joe Blogs', email: 'joeblogs@digitalhen.com', phoneNumber: '+15014442720'},
  {name: 'Jennifer Yee', email: 'jyee16@gmail.com', phoneNumber: '+19176502722'},
];

db.users.insert(users);
db.users.find();


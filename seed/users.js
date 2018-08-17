db.dropDatabase();

const users = [
  {username: 'digitalhen', name: 'Henry Williams', password: '123', email: 'recording@digitalhen.com', phoneNumber: '+14156694559'},
  {username: 'tchapman', name: 'Terry Chapman', password: '123', email: 'blahblah@digitalhen.com', phoneNumber: '+12124442796'},
  {username: 'jblogs', name: 'Joe Blogs', password: '123', email: 'joeblogs@digitalhen.com', phoneNumber: '+15014442720'},
  {username: 'jyee', name: 'Jennifer Yee', password: '123', email: 'jyee16@gmail.com', phoneNumber: '+19176502722'},
  {username: 'dkeeler', name: 'Dan Keeler', password: '123', email: 'dan.keeler@wsj.com', phoneNumber: '+19174789011'},
];

db.users.insert(users);
db.users.find();


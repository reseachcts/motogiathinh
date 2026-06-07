"""Famous people + famous fictional characters. ~280 names, used to populate
the mock student dataset. Names recur across the 1020+ student rows
(ma_hoc_vien is the unique identifier) but the spread feels diverse.
"""

FAMOUS_NAMES = [
    # Hollywood
    "Tom Cruise", "Brad Pitt", "Leonardo DiCaprio", "Robert Downey", "Will Smith",
    "Johnny Depp", "Denzel Washington", "Morgan Freeman", "Al Pacino", "Robert De Niro",
    "Keanu Reeves", "Matt Damon", "Ben Affleck", "Chris Hemsworth", "Chris Evans",
    "Mark Ruffalo", "Jeremy Renner", "Hugh Jackman", "Ryan Reynolds", "Ryan Gosling",
    "Scarlett Johansson", "Jennifer Lawrence", "Emma Watson", "Natalie Portman",
    "Angelina Jolie", "Anne Hathaway", "Sandra Bullock", "Julia Roberts", "Meryl Streep",
    "Charlize Theron", "Cate Blanchett", "Nicole Kidman", "Reese Witherspoon",
    # Music
    "Taylor Swift", "Beyoncé Knowles", "Adele Adkins", "Ariana Grande", "Bruno Mars",
    "Justin Bieber", "Selena Gomez", "Rihanna Fenty", "Lady Gaga", "Madonna Ciccone",
    "Michael Jackson", "Elvis Presley", "Freddie Mercury", "John Lennon", "Paul McCartney",
    "Mariah Carey", "Whitney Houston", "Britney Spears", "Christina Aguilera", "Shakira Ripoll",
    "Eminem Mathers", "Drake Graham", "Kanye West", "Jay Z Carter", "Snoop Dogg",
    # Sports
    "Cristiano Ronaldo", "Lionel Messi", "Neymar Junior", "Kylian Mbappé", "Erling Haaland",
    "Mohamed Salah", "Kevin De Bruyne", "Roger Federer", "Rafael Nadal", "Novak Djokovic",
    "Serena Williams", "Venus Williams", "Usain Bolt", "Michael Jordan", "LeBron James",
    "Kobe Bryant", "Stephen Curry", "Tiger Woods", "Lewis Hamilton", "Max Verstappen",
    # K-pop / Asian
    "Lee Min Ho", "Song Hye Kyo", "Park Seo Joon", "Gong Yoo", "Bae Suzy",
    "Hyun Bin", "Son Ye Jin", "Kim Soo Hyun", "IU Ji Eun", "Jung Ho Yeon",
    "Jisoo Kim", "Jennie Kim", "Rosé Park", "Lisa Manoban", "BTS Jin",
    "BTS Suga", "BTS J Hope", "BTS RM", "BTS Jimin", "BTS V",
    "BTS Jungkook", "Aishwarya Rai", "Shah Rukh Khan", "Deepika Padukone", "Priyanka Chopra",
    # Tech / business
    "Steve Jobs", "Bill Gates", "Elon Musk", "Mark Zuckerberg", "Jeff Bezos",
    "Larry Page", "Sergey Brin", "Sundar Pichai", "Tim Cook", "Satya Nadella",
    "Warren Buffett", "Jack Ma", "Tony Stark Industries", "Pony Ma", "Masayoshi Son",
    # Vietnamese — historical figures + scholars
    "Trần Hưng Đạo", "Lý Thường Kiệt", "Nguyễn Trãi", "Trưng Trắc", "Trưng Nhị",
    "Lê Lợi", "Quang Trung", "Hai Bà Trưng", "Phạm Tuân", "Ngô Bảo Châu",
    "Lý Thái Tổ", "Trần Nhân Tông", "Lý Công Uẩn", "Ngô Quyền", "Đinh Tiên Hoàng",
    "Lê Thánh Tông", "Nguyễn Du", "Hồ Xuân Hương", "Nguyễn Bỉnh Khiêm", "Chu Văn An",
    "Võ Nguyên Giáp", "Trương Định", "Phan Bội Châu", "Phan Châu Trinh", "Đặng Thai Mai",
    # Vietnamese — singers / music
    "Sơn Tùng MTP", "Mỹ Tâm", "Hồ Ngọc Hà", "Đàm Vĩnh Hưng", "Tuấn Hưng",
    "Hà Anh Tuấn", "Đen Vâu", "Hoàng Thùy Linh", "Bích Phương", "Tóc Tiên",
    "Lệ Quyên", "Bằng Kiều", "Khánh Linh", "Soobin Hoàng Sơn", "Erik Lê",
    "Phương Mỹ Chi", "Văn Mai Hương", "Bùi Anh Tuấn", "Hồ Quang Hiếu", "Trúc Nhân",
    "Vũ Cát Tường", "Min Nguyễn", "Châu Đăng Khoa", "Khắc Việt", "Khắc Hưng",
    "Đông Nhi", "Ông Cao Thắng", "Noo Phước Thịnh", "Hồ Hoài Anh", "Lưu Hương Giang",
    "Cẩm Ly", "Quang Lê", "Quang Dũng", "Đan Trường", "Cẩm Vân",
    # Vietnamese — actors / TV
    "Hoài Linh", "Trấn Thành", "Trường Giang", "Hari Won", "Việt Hương",
    "Nhã Phương", "Ninh Dương Lan Ngọc", "Diễm My", "Tăng Thanh Hà", "Mỹ Linh",
    "Thanh Hằng", "Hồng Nhung", "Vân Trang", "Lương Mạnh Hải", "Ngô Kiến Huy",
    "Khả Như", "Kiều Minh Tuấn", "Bảo Anh", "Sĩ Thanh", "Quang Trung",
    "Lý Hải", "Việt Anh", "Mạnh Trường", "Hồng Đăng", "Hồng Diễm",
    "Phương Oanh", "Bảo Thanh", "Thanh Sơn", "Hồng Loan", "Lan Phương",
    # Vietnamese — football
    "Nguyễn Quang Hải", "Công Phượng", "Văn Toàn", "Văn Hậu", "Tiến Linh",
    "Hoàng Đức", "Đặng Văn Lâm", "Bùi Tiến Dũng", "Đỗ Hùng Dũng", "Quế Ngọc Hải",
    "Văn Thanh", "Trọng Hoàng", "Xuân Trường", "Tuấn Anh", "Đức Huy",
    "Thành Chung", "Văn Đức", "Văn Quyết", "Tuấn Hải", "Nhâm Mạnh Dũng",
    "Phan Tuấn Tài", "Vũ Văn Thanh", "Hồ Tấn Tài", "Park Hang Seo", "Troussier",
    # Vietnamese — business / tech
    "Phạm Nhật Vượng", "Nguyễn Thị Phương Thảo", "Trần Bá Dương", "Trương Gia Bình", "Đoàn Nguyên Đức",
    "Hồ Hùng Anh", "Nguyễn Đăng Quang", "Trần Đình Long", "Lý Quí Trung", "Nguyễn Mạnh Hùng",
    "Trương Mỹ Lan", "Bùi Thành Nhơn", "Phạm Văn Tam", "Nguyễn Hà Đông", "Lê Hồng Minh",
    # Vietnamese — creators / influencers
    "Khoa Pug", "Cris Phan", "Bà Tân Vlog", "Quỳnh Trần JP", "NTN Vlogs",
    "PewPew Streamer", "Misthy Live", "Linh Ngọc Đàm", "Độ Mixi", "Viruss Streamer",
    "Hậu Hoàng", "Thái Vũ FAP", "Trang Hý", "Giang Ơi", "Hà Linh Official",
    # Harry Potter
    "Harry Potter", "Hermione Granger", "Ron Weasley", "Albus Dumbledore", "Severus Snape",
    "Minerva McGonagall", "Sirius Black", "Remus Lupin", "Bellatrix Lestrange", "Lord Voldemort",
    "Draco Malfoy", "Luna Lovegood", "Ginny Weasley", "Neville Longbottom", "Rubeus Hagrid",
    # LOTR / Hobbit
    "Frodo Baggins", "Samwise Gamgee", "Gandalf Stormcrow", "Aragorn Elessar", "Legolas Greenleaf",
    "Gimli Glóinul", "Boromir Denethor", "Galadriel Lady", "Bilbo Baggins", "Peregrin Took",
    "Meriadoc Brandybuck", "Saruman White", "Elrond Halfelven", "Arwen Undómiel", "Théoden King",
    # Star Wars
    "Luke Skywalker", "Princess Leia", "Han Solo", "Darth Vader", "Master Yoda",
    "Obi Wan Kenobi", "Anakin Skywalker", "Padmé Amidala", "Rey Skywalker", "Kylo Ren",
    "Mace Windu", "Qui Gon Jinn", "Boba Fett", "Mandalorian Din", "Ahsoka Tano",
    # Marvel
    "Tony Stark", "Steve Rogers", "Bruce Banner", "Peter Parker", "Wanda Maximoff",
    "Natasha Romanoff", "Clint Barton", "Thor Odinson", "Loki Laufeyson", "TChalla King",
    "Stephen Strange", "Carol Danvers", "Scott Lang", "Hope Pym", "Bucky Barnes",
    "Sam Wilson", "Vision Stone", "Nick Fury", "Yelena Belova", "Shang Chi",
    # DC
    "Bruce Wayne", "Clark Kent", "Diana Prince", "Barry Allen", "Hal Jordan",
    "Arthur Curry", "Victor Stone", "Joker Quinn", "Harley Quinn", "Lex Luthor",
    "Selina Kyle", "Oswald Cobblepot", "Edward Nigma", "Lois Lane", "Alfred Pennyworth",
    # Naruto
    "Naruto Uzumaki", "Sasuke Uchiha", "Sakura Haruno", "Kakashi Hatake", "Itachi Uchiha",
    "Hinata Hyuga", "Shikamaru Nara", "Madara Uchiha", "Minato Namikaze", "Jiraiya Sannin",
    "Tsunade Senju", "Orochimaru Sannin", "Pain Akatsuki", "Obito Uchiha", "Gaara Kazekage",
    # Dragon Ball
    "Son Goku", "Vegeta Saiyan", "Piccolo Daimao", "Son Gohan", "Trunks Saiyan",
    "Bulma Brief", "Master Roshi", "Krillin Earth", "Yamcha Bandit", "Frieza Cold",
    "Cell Bio", "Majin Buu", "Beerus God", "Whis Angel", "Jiren Pride",
    # Game of Thrones
    "Daenerys Targaryen", "Jon Snow", "Tyrion Lannister", "Arya Stark", "Sansa Stark",
    "Cersei Lannister", "Jaime Lannister", "Ned Stark", "Robb Stark", "Brandon Stark",
    "Catelyn Stark", "Theon Greyjoy", "Samwell Tarly", "Davos Seaworth", "Petyr Baelish",
    # One Piece + anime
    "Monkey D Luffy", "Roronoa Zoro", "Nami Cat", "Sanji Vinsmoke", "Portgas D Ace",
    "Trafalgar Law", "Nico Robin", "Tony Chopper", "Usopp Sniper", "Franky Cyborg",
    "Brook Soul", "Edward Newgate", "Shanks Redhair", "Eren Yeager", "Mikasa Ackerman",
    "Levi Ackerman", "Armin Arlert", "Light Yagami", "L Lawliet", "Edward Elric",
    "Alphonse Elric", "Roy Mustang", "Saitama Punch", "Genos Cyborg", "Goku Black",
    # Disney / Pixar
    "Mickey Mouse", "Donald Duck", "Goofy Dog", "Elsa Arendelle", "Anna Arendelle",
    "Simba Lion", "Aladdin Genie", "Princess Ariel", "Princess Belle", "Snow White",
    "Cinderella Royal", "Maleficent Fairy", "Buzz Lightyear", "Woody Sheriff", "Lightning McQueen",
    # Vietnamese folklore
    "Sơn Tinh", "Thủy Tinh", "Nàng Tấm", "Cô Cám", "Thạch Sanh",
    "Lý Thông", "Mai An Tiêm", "Chử Đồng Tử", "Tiên Dung Công Chúa", "Cuội Bán Đất",
    # Misc / classics
    "Sherlock Holmes", "John Watson", "Hercule Poirot", "Jane Marple", "James Bond",
    "Indiana Jones", "Forrest Gump", "Jack Sparrow", "Captain Nemo", "Don Quixote",
    "Romeo Montague", "Juliet Capulet", "Hamlet Denmark", "Macbeth Thane", "Othello Moor",
    "Walter White", "Jesse Pinkman", "Saul Goodman", "Tony Soprano", "Don Corleone",
    "Vito Corleone", "Michael Corleone", "Tyler Durden", "Jack Bauer", "Dexter Morgan",
    "Frank Underwood", "Daenerys Targaryen II", "Aragorn II", "Gandalf the White",
]

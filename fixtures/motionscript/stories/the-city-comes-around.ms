// THE CITY COMES AROUND
// 30 seconds, one seamless loop. Isometric district, repeating every 880 world units.
// Projection (builder-side): screen = (X − Y, (X + Y) / 2 − Z). X is the street, Y toward the viewer, Z up.
// 0:00 the café corner wakes. 0:05 three façades, a van settles, a walker passes behind it.
// 0:10 the camera rises over the rooftops; the train enters upper left at 0:13.
// 0:15 the widest view; the train passes behind a water tank, between buildings, over the viaduct.
// 0:20 the camera descends to the next café. 0:29.5 it holds on the opening composition, one unit on.
// Every actor repeats with a period that divides 30s. Sound cues are a caption; MotionScript has no audio.
scene "the-city-comes-around" {
  version "0.2";
  viewport (1280, 720);
  background #e6d5b8;
  duration 30s;
  requires "easing.hold";
  requires "easing.cubicBezier";
  requires "geometry.roundedRect";
  requires "text.basic";
};
camera main {
  position (50, 2);
  zoom 2;
  rotation 0deg;
};
path gBase { zIndex 0; fill #d8c7aa;
  move (-1000, -1260); line (3400, 940); line (2380, 1450); line (-2020, -750); close;
};
path gPave { zIndex 0; fill #e4d6bd;
  move (-1668, -926); line (2732, 1274); line (2626, 1327); line (-1774, -873); close; move (-1838, -841); line (2562, 1359); line (2542, 1369); line (-1858, -831); close;
};
path gRoadFar { zIndex 0; fill #8a8682;
  move (-1630, -945); line (2770, 1255); line (2730, 1275); line (-1670, -925); close; move (-1032, -364); line (-152, 76); line (-174, 87); line (-1054, -353); close; move (-1136, -312); line (-256, 128);
  line (-286, 143); line (-1166, -297); close; move (-152, 76); line (728, 516); line (706, 527); line (-174, 87); close; move (-256, 128); line (624, 568); line (594, 583); line (-286, 143);
  close; move (728, 516); line (1608, 956); line (1586, 967); line (706, 527); close; move (624, 568); line (1504, 1008); line (1474, 1023); line (594, 583); close;
};
path gRoad { zIndex 0; fill #7d7a78;
  move (-1774, -873); line (2626, 1327); line (2562, 1359); line (-1838, -841); close; move (-180, -790); line (-120, -760); line (-834, -403); line (-894, -433); close; move (220, -590); line (280, -560);
  line (-434, -203); line (-494, -233); close; move (700, -350); line (760, -320); line (46, 37); line (-14, 7); close; move (1100, -150); line (1160, -120); line (446, 237); line (386, 207);
  close; move (1580, 90); line (1640, 120); line (926, 477); line (866, 447); close; move (1980, 290); line (2040, 320); line (1326, 677); line (1266, 647); close;
};
path gCurb { zIndex 0; fill #b9a78c;
  move (-1772.5, -873.75); line (2627.5, 1326.25); line (2626, 1327); line (-1774, -873); close; move (-1838, -841); line (2562, 1359); line (2560.5, 1359.75); line (-1839.5, -840.25); close; move (-1858, -831); line (2542, 1369);
  line (2540, 1370); line (-1860, -830); close;
};
path gStripe { zIndex 0; fill #f3ecdd;
  move (-247, -107.5); line (-225, -96.5); line (-229, -94.5); line (-251, -105.5); close; move (-255, -103.5); line (-233, -92.5); line (-237, -90.5); line (-259, -101.5); close; move (-263, -99.5); line (-241, -88.5);
  line (-245, -86.5); line (-267, -97.5); close; move (-271, -95.5); line (-249, -84.5); line (-253, -82.5); line (-275, -93.5); close; move (-279, -91.5); line (-257, -80.5); line (-261, -78.5); line (-283, -89.5);
  close; move (-287, -87.5); line (-265, -76.5); line (-269, -74.5); line (-291, -85.5); close; move (-295, -83.5); line (-273, -72.5); line (-277, -70.5); line (-299, -81.5); close; move (-303, -79.5);
  line (-281, -68.5); line (-285, -66.5); line (-307, -77.5); close; move (47, 39.5); line (69, 50.5); line (65, 52.5); line (43, 41.5); close; move (39, 43.5); line (61, 54.5); line (57, 56.5);
  line (35, 45.5); close; move (31, 47.5); line (53, 58.5); line (49, 60.5); line (27, 49.5); close; move (23, 51.5); line (45, 62.5); line (41, 64.5); line (19, 53.5); close;
  move (15, 55.5); line (37, 66.5); line (33, 68.5); line (11, 57.5); close; move (7, 59.5); line (29, 70.5); line (25, 72.5); line (3, 61.5); close; move (-1, 63.5); line (21, 74.5);
  line (17, 76.5); line (-5, 65.5); close; move (-9, 67.5); line (13, 78.5); line (9, 80.5); line (-13, 69.5); close; move (225, 128.5); line (247, 139.5); line (243, 141.5); line (221, 130.5);
  close; move (217, 132.5); line (239, 143.5); line (235, 145.5); line (213, 134.5); close; move (209, 136.5); line (231, 147.5); line (227, 149.5); line (205, 138.5); close; move (201, 140.5);
  line (223, 151.5); line (219, 153.5); line (197, 142.5); close; move (193, 144.5); line (215, 155.5); line (211, 157.5); line (189, 146.5); close; move (185, 148.5); line (207, 159.5); line (203, 161.5);
  line (181, 150.5); close; move (177, 152.5); line (199, 163.5); line (195, 165.5); line (173, 154.5); close; move (169, 156.5); line (191, 167.5); line (187, 169.5); line (165, 158.5); close;
  move (447, 239.5); line (469, 250.5); line (465, 252.5); line (443, 241.5); close; move (439, 243.5); line (461, 254.5); line (457, 256.5); line (435, 245.5); close; move (431, 247.5); line (453, 258.5);
  line (449, 260.5); line (427, 249.5); close; move (423, 251.5); line (445, 262.5); line (441, 264.5); line (419, 253.5); close; move (415, 255.5); line (437, 266.5); line (433, 268.5); line (411, 257.5);
  close; move (407, 259.5); line (429, 270.5); line (425, 272.5); line (403, 261.5); close; move (399, 263.5); line (421, 274.5); line (417, 276.5); line (395, 265.5); close; move (391, 267.5);
  line (413, 278.5); line (409, 280.5); line (387, 269.5); close; move (633, 332.5); line (655, 343.5); line (651, 345.5); line (629, 334.5); close; move (625, 336.5); line (647, 347.5); line (643, 349.5);
  line (621, 338.5); close; move (617, 340.5); line (639, 351.5); line (635, 353.5); line (613, 342.5); close; move (609, 344.5); line (631, 355.5); line (627, 357.5); line (605, 346.5); close;
  move (601, 348.5); line (623, 359.5); line (619, 361.5); line (597, 350.5); close; move (593, 352.5); line (615, 363.5); line (611, 365.5); line (589, 354.5); close; move (585, 356.5); line (607, 367.5);
  line (603, 369.5); line (581, 358.5); close; move (577, 360.5); line (599, 371.5); line (595, 373.5); line (573, 362.5); close; move (927, 479.5); line (949, 490.5); line (945, 492.5); line (923, 481.5);
  close; move (919, 483.5); line (941, 494.5); line (937, 496.5); line (915, 485.5); close; move (911, 487.5); line (933, 498.5); line (929, 500.5); line (907, 489.5); close; move (903, 491.5);
  line (925, 502.5); line (921, 504.5); line (899, 493.5); close; move (895, 495.5); line (917, 506.5); line (913, 508.5); line (891, 497.5); close; move (887, 499.5); line (909, 510.5); line (905, 512.5);
  line (883, 501.5); close; move (879, 503.5); line (901, 514.5); line (897, 516.5); line (875, 505.5); close; move (871, 507.5); line (893, 518.5); line (889, 520.5); line (867, 509.5); close;
  move (1105, 568.5); line (1127, 579.5); line (1123, 581.5); line (1101, 570.5); close; move (1097, 572.5); line (1119, 583.5); line (1115, 585.5); line (1093, 574.5); close; move (1089, 576.5); line (1111, 587.5);
  line (1107, 589.5); line (1085, 578.5); close; move (1081, 580.5); line (1103, 591.5); line (1099, 593.5); line (1077, 582.5); close; move (1073, 584.5); line (1095, 595.5); line (1091, 597.5); line (1069, 586.5);
  close; move (1065, 588.5); line (1087, 599.5); line (1083, 601.5); line (1061, 590.5); close; move (1057, 592.5); line (1079, 603.5); line (1075, 605.5); line (1053, 594.5); close; move (1049, 596.5);
  line (1071, 607.5); line (1067, 609.5); line (1045, 598.5); close;
};
path gLane { zIndex 0; fill #d9cfba;
  move (-1821, -849.5); line (2579, 1350.5); line (2578, 1351); line (-1822, -849); close; move (-404.5, -157.75); line (-388.5, -149.75); line (-389.5, -149.25); line (-405.5, -157.25); close; move (-364.5, -137.75); line (-348.5, -129.75);
  line (-349.5, -129.25); line (-365.5, -137.25); close; move (-324.5, -117.75); line (-308.5, -109.75); line (-309.5, -109.25); line (-325.5, -117.25); close; move (-284.5, -97.75); line (-268.5, -89.75); line (-269.5, -89.25); line (-285.5, -97.25);
  close; move (-244.5, -77.75); line (-228.5, -69.75); line (-229.5, -69.25); line (-245.5, -77.25); close; move (-204.5, -57.75); line (-188.5, -49.75); line (-189.5, -49.25); line (-205.5, -57.25); close; move (-164.5, -37.75);
  line (-148.5, -29.75); line (-149.5, -29.25); line (-165.5, -37.25); close; move (-124.5, -17.75); line (-108.5, -9.75); line (-109.5, -9.25); line (-125.5, -17.25); close; move (-84.5, 2.25); line (-68.5, 10.25); line (-69.5, 10.75);
  line (-85.5, 2.75); close; move (-44.5, 22.25); line (-28.5, 30.25); line (-29.5, 30.75); line (-45.5, 22.75); close; move (-4.5, 42.25); line (11.5, 50.25); line (10.5, 50.75); line (-5.5, 42.75); close;
  move (35.5, 62.25); line (51.5, 70.25); line (50.5, 70.75); line (34.5, 62.75); close; move (75.5, 82.25); line (91.5, 90.25); line (90.5, 90.75); line (74.5, 82.75); close; move (115.5, 102.25); line (131.5, 110.25);
  line (130.5, 110.75); line (114.5, 102.75); close; move (155.5, 122.25); line (171.5, 130.25); line (170.5, 130.75); line (154.5, 122.75); close; move (195.5, 142.25); line (211.5, 150.25); line (210.5, 150.75); line (194.5, 142.75);
  close; move (235.5, 162.25); line (251.5, 170.25); line (250.5, 170.75); line (234.5, 162.75); close; move (275.5, 182.25); line (291.5, 190.25); line (290.5, 190.75); line (274.5, 182.75); close; move (315.5, 202.25);
  line (331.5, 210.25); line (330.5, 210.75); line (314.5, 202.75); close; move (355.5, 222.25); line (371.5, 230.25); line (370.5, 230.75); line (354.5, 222.75); close; move (395.5, 242.25); line (411.5, 250.25); line (410.5, 250.75);
  line (394.5, 242.75); close; move (435.5, 262.25); line (451.5, 270.25); line (450.5, 270.75); line (434.5, 262.75); close; move (475.5, 282.25); line (491.5, 290.25); line (490.5, 290.75); line (474.5, 282.75); close;
  move (515.5, 302.25); line (531.5, 310.25); line (530.5, 310.75); line (514.5, 302.75); close; move (555.5, 322.25); line (571.5, 330.25); line (570.5, 330.75); line (554.5, 322.75); close; move (595.5, 342.25); line (611.5, 350.25);
  line (610.5, 350.75); line (594.5, 342.75); close; move (635.5, 362.25); line (651.5, 370.25); line (650.5, 370.75); line (634.5, 362.75); close; move (675.5, 382.25); line (691.5, 390.25); line (690.5, 390.75); line (674.5, 382.75);
  close; move (715.5, 402.25); line (731.5, 410.25); line (730.5, 410.75); line (714.5, 402.75); close; move (755.5, 422.25); line (771.5, 430.25); line (770.5, 430.75); line (754.5, 422.75); close; move (795.5, 442.25);
  line (811.5, 450.25); line (810.5, 450.75); line (794.5, 442.75); close; move (835.5, 462.25); line (851.5, 470.25); line (850.5, 470.75); line (834.5, 462.75); close; move (875.5, 482.25); line (891.5, 490.25); line (890.5, 490.75);
  line (874.5, 482.75); close; move (915.5, 502.25); line (931.5, 510.25); line (930.5, 510.75); line (914.5, 502.75); close; move (955.5, 522.25); line (971.5, 530.25); line (970.5, 530.75); line (954.5, 522.75); close;
  move (995.5, 542.25); line (1011.5, 550.25); line (1010.5, 550.75); line (994.5, 542.75); close; move (1035.5, 562.25); line (1051.5, 570.25); line (1050.5, 570.75); line (1034.5, 562.75); close; move (1075.5, 582.25); line (1091.5, 590.25);
  line (1090.5, 590.75); line (1074.5, 582.75); close; move (1115.5, 602.25); line (1131.5, 610.25); line (1130.5, 610.75); line (1114.5, 602.75); close; move (1155.5, 622.25); line (1171.5, 630.25); line (1170.5, 630.75); line (1154.5, 622.75);
  close; move (249.5, -575.25); line (250.5, -574.75); line (-447.5, -225.75); line (-448.5, -226.25); close; move (729.5, -335.25); line (730.5, -334.75); line (32.5, 14.25); line (31.5, 13.75); close; move (1129.5, -135.25);
  line (1130.5, -134.75); line (432.5, 214.25); line (431.5, 213.75); close; move (1609.5, 104.75); line (1610.5, 105.25); line (912.5, 454.25); line (911.5, 453.75); close; move (2009.5, 304.75); line (2010.5, 305.25); line (1312.5, 654.25);
  line (1311.5, 653.75); close;
};
path gGrass { zIndex 0; fill #a9b979;
  move (-182, -319); line (38, -209); line (-50, -165); line (-270, -275); close; move (698, 121); line (918, 231); line (830, 275); line (610, 165); close; move (-982, -389); line (-102, 51);
  line (-150, 75); line (-1030, -365); close; move (-102, 51); line (778, 491); line (730, 515); line (-150, 75); close; move (778, 491); line (1658, 931); line (1610, 955); line (730, 515);
  close;
};
path fTop { zIndex 1; fill #a9b3a4;
  move (20, -406); line (170, -331); line (130, -311); line (-20, -386); close; move (200, -388); line (290, -343); line (250, -323); line (160, -368); close; move (330, -215); line (420, -170);
  line (380, -150); line (290, -195); close; move (430, -237); line (560, -172); line (520, -152); line (390, -217); close; move (590, -103); line (760, -18); line (720, 2); line (550, -83);
  close; move (780, -80); line (890, -25); line (850, -5); line (740, -60); close; move (900, 34); line (1050, 109); line (1010, 129); line (860, 54); close; move (1080, 52);
  line (1170, 97); line (1130, 117); line (1040, 72); close; move (1210, 225); line (1300, 270); line (1260, 290); line (1170, 245); close; move (1310, 203); line (1440, 268); line (1400, 288);
  line (1270, 223); close; move (160, -454); line (290, -389); line (230, -359); line (100, -424); close; move (310, -325); line (420, -270); line (360, -240); line (250, -295); close;
  move (430, -283); line (600, -198); line (540, -168); line (370, -253); close; move (630, -255); line (740, -200); line (680, -170); line (570, -225); close; move (760, -136); line (910, -61);
  line (850, -31); line (700, -106); close; move (920, -128); line (1010, -83); line (950, -53); line (860, -98); close; move (1040, -14); line (1170, 51); line (1110, 81); line (980, 16);
  close; move (1190, 115); line (1300, 170); line (1240, 200); line (1130, 145); close; move (1310, 157); line (1480, 242); line (1420, 272); line (1250, 187); close; move (400, -444);
  line (530, -379); line (460, -344); line (330, -409); close; move (540, -392); line (670, -327); line (600, -292); line (470, -357); close; move (690, -263); line (860, -178); line (790, -143);
  line (620, -228); close; move (870, -245); line (980, -190); line (910, -155); line (800, -210); close; move (1010, -121); line (1160, -46); line (1090, -11); line (940, -86); close;
  move (1180, -108); line (1270, -63); line (1200, -28); line (1110, -73); close; move (1280, -4); line (1410, 61); line (1340, 96); line (1210, 31); close; move (540, -476); line (650, -421);
  line (570, -381); line (460, -436); close; move (660, -434); line (770, -379); line (690, -339); line (580, -394); close; move (800, -310); line (950, -235); line (870, -195); line (720, -270);
  close; move (970, -297); line (1060, -252); line (980, -212); line (890, -257); close; move (1070, -193); line (1200, -128); line (1120, -88); line (990, -153); close; move (1230, -185);
  line (1400, -100); line (1320, -60); line (1150, -145); close;
};
path fFront { zIndex 1; fill #cdb79a;
  move (-330, -455); line (-160, -370); line (-160, -438); line (-330, -523); close; move (-140, -360); line (-30, -305); line (-30, -445); line (-140, -500); close; move (-20, -300); line (130, -225);
  line (130, -311); line (-20, -386); close; move (160, -210); line (250, -165); line (250, -323); line (160, -368); close; move (290, -145); line (380, -100); line (380, -150); line (290, -195);
  close; move (390, -95); line (520, -30); line (520, -152); line (390, -217); close; move (550, -15); line (720, 70); line (720, 2); line (550, -83); close; move (740, 80);
  line (850, 135); line (850, -5); line (740, -60); close; move (860, 140); line (1010, 215); line (1010, 129); line (860, 54); close; move (1040, 230); line (1130, 275); line (1130, 117);
  line (1040, 72); close; move (1170, 295); line (1260, 340); line (1260, 290); line (1170, 245); close; move (1270, 345); line (1400, 410); line (1400, 288); line (1270, 223); close;
  move (-180, -460); line (-30, -385); line (-30, -471); line (-180, -546); close; move (-20, -380); line (70, -335); line (70, -493); line (-20, -538); close; move (100, -320); line (230, -255);
  line (230, -359); line (100, -424); close; move (250, -245); line (360, -190); line (360, -240); line (250, -295); close; move (370, -185); line (540, -100); line (540, -168); line (370, -253);
  close; move (570, -85); line (680, -30); line (680, -170); line (570, -225); close; move (700, -20); line (850, 55); line (850, -31); line (700, -106); close; move (860, 60);
  line (950, 105); line (950, -53); line (860, -98); close; move (980, 120); line (1110, 185); line (1110, 81); line (980, 16); close; move (1130, 195); line (1240, 250); line (1240, 200);
  line (1130, 145); close; move (1250, 255); line (1420, 340); line (1420, 272); line (1250, 187); close; move (60, -440); line (210, -365); line (210, -451); line (60, -526); close;
  move (230, -355); line (320, -310); line (320, -468); line (230, -513); close; move (330, -305); line (460, -240); line (460, -344); line (330, -409); close; move (470, -235); line (600, -170);
  line (600, -292); line (470, -357); close; move (620, -160); line (790, -75); line (790, -143); line (620, -228); close; move (800, -70); line (910, -15); line (910, -155); line (800, -210);
  close; move (940, 0); line (1090, 75); line (1090, -11); line (940, -86); close; move (1110, 85); line (1200, 130); line (1200, -28); line (1110, -73); close; move (1210, 135);
  line (1340, 200); line (1340, 96); line (1210, 31); close; move (270, -445); line (440, -360); line (440, -500); line (270, -585); close; move (460, -350); line (570, -295); line (570, -381);
  line (460, -436); close; move (580, -290); line (690, -235); line (690, -339); line (580, -394); close; move (720, -220); line (870, -145); line (870, -195); line (720, -270); close;
  move (890, -135); line (980, -90); line (980, -212); line (890, -257); close; move (990, -85); line (1120, -20); line (1120, -88); line (990, -153); close; move (1150, -5); line (1320, 80);
  line (1320, -60); line (1150, -145); close;
};
path fSide { zIndex 1; fill #b8a184;
  move (-120, -390); line (-160, -370); line (-160, -438); line (-120, -458); close; move (10, -325); line (-30, -305); line (-30, -445); line (10, -465); close; move (170, -245); line (130, -225);
  line (130, -311); line (170, -331); close; move (290, -185); line (250, -165); line (250, -323); line (290, -343); close; move (420, -120); line (380, -100); line (380, -150); line (420, -170);
  close; move (560, -50); line (520, -30); line (520, -152); line (560, -172); close; move (760, 50); line (720, 70); line (720, 2); line (760, -18); close; move (890, 115);
  line (850, 135); line (850, -5); line (890, -25); close; move (1050, 195); line (1010, 215); line (1010, 129); line (1050, 109); close; move (1170, 255); line (1130, 275); line (1130, 117);
  line (1170, 97); close; move (1300, 320); line (1260, 340); line (1260, 290); line (1300, 270); close; move (30, -415); line (-30, -385); line (-30, -471); line (30, -501); close;
  move (130, -365); line (70, -335); line (70, -493); line (130, -523); close; move (290, -285); line (230, -255); line (230, -359); line (290, -389); close; move (420, -220); line (360, -190);
  line (360, -240); line (420, -270); close; move (600, -130); line (540, -100); line (540, -168); line (600, -198); close; move (740, -60); line (680, -30); line (680, -170); line (740, -200);
  close; move (910, 25); line (850, 55); line (850, -31); line (910, -61); close; move (1010, 75); line (950, 105); line (950, -53); line (1010, -83); close; move (1170, 155);
  line (1110, 185); line (1110, 81); line (1170, 51); close; move (1300, 220); line (1240, 250); line (1240, 200); line (1300, 170); close; move (280, -400); line (210, -365); line (210, -451);
  line (280, -486); close; move (390, -345); line (320, -310); line (320, -468); line (390, -503); close; move (530, -275); line (460, -240); line (460, -344); line (530, -379); close;
  move (670, -205); line (600, -170); line (600, -292); line (670, -327); close; move (860, -110); line (790, -75); line (790, -143); line (860, -178); close; move (980, -50); line (910, -15);
  line (910, -155); line (980, -190); close; move (1160, 40); line (1090, 75); line (1090, -11); line (1160, -46); close; move (1270, 95); line (1200, 130); line (1200, -28); line (1270, -63);
  close; move (520, -400); line (440, -360); line (440, -500); line (520, -540); close; move (650, -335); line (570, -295); line (570, -381); line (650, -421); close; move (770, -275);
  line (690, -235); line (690, -339); line (770, -379); close; move (950, -185); line (870, -145); line (870, -195); line (950, -235); close; move (1060, -130); line (980, -90); line (980, -212);
  line (1060, -252); close; move (1200, -60); line (1120, -20); line (1120, -88); line (1200, -128); close; move (1400, 40); line (1320, 80); line (1320, -60); line (1400, -100); close;
};
path fWin { zIndex 1; fill #a6a69a;
  move (-12, -348); line (122, -281); line (122, -289); line (-12, -356); close; move (168, -330); line (242, -293); line (242, -301); line (168, -338); close; move (398, -179); line (512, -122);
  line (512, -130); line (398, -187); close; move (748, -22); line (842, 25); line (842, 17); line (748, -30); close; move (868, 92); line (1002, 159); line (1002, 151); line (868, 84);
  close; move (1048, 110); line (1122, 147); line (1122, 139); line (1048, 102); close; move (1278, 261); line (1392, 318); line (1392, 310); line (1278, 253); close; move (108, -386);
  line (222, -329); line (222, -337); line (108, -394); close; move (578, -187); line (672, -140); line (672, -148); line (578, -195); close; move (708, -68); line (842, -1); line (842, -9);
  line (708, -76); close; move (868, -60); line (942, -23); line (942, -31); line (868, -68); close; move (988, 54); line (1102, 111); line (1102, 103); line (988, 46); close;
  move (338, -371); line (452, -314); line (452, -322); line (338, -379); close; move (478, -319); line (592, -262); line (592, -270); line (478, -327); close; move (808, -172); line (902, -125);
  line (902, -133); line (808, -180); close; move (948, -48); line (1082, 19); line (1082, 11); line (948, -56); close; move (1118, -35); line (1192, 2); line (1192, -6); line (1118, -43);
  close; move (1218, 69); line (1332, 126); line (1332, 118); line (1218, 61); close; move (468, -398); line (562, -351); line (562, -359); line (468, -406); close; move (588, -356);
  line (682, -309); line (682, -317); line (588, -364); close; move (898, -219); line (972, -182); line (972, -190); line (898, -227); close; move (1158, -107); line (1312, -30); line (1312, -38);
  line (1158, -115); close;
};
path rPier { zIndex 2; fill #b2a493;
  move (-323, -398.5); line (-316, -395); line (-316, -449); line (-323, -452.5); close; move (-243, -358.5); line (-236, -355); line (-236, -409); line (-243, -412.5); close; move (-163, -318.5); line (-156, -315);
  line (-156, -369); line (-163, -372.5); close; move (-83, -278.5); line (-76, -275); line (-76, -329); line (-83, -332.5); close; move (-3, -238.5); line (4, -235); line (4, -289); line (-3, -292.5);
  close; move (77, -198.5); line (84, -195); line (84, -249); line (77, -252.5); close; move (157, -158.5); line (164, -155); line (164, -209); line (157, -212.5); close; move (237, -118.5);
  line (244, -115); line (244, -169); line (237, -172.5); close; move (317, -78.5); line (324, -75); line (324, -129); line (317, -132.5); close; move (397, -38.5); line (404, -35); line (404, -89);
  line (397, -92.5); close; move (477, 1.5); line (484, 5); line (484, -49); line (477, -52.5); close; move (557, 41.5); line (564, 45); line (564, -9); line (557, -12.5); close;
  move (637, 81.5); line (644, 85); line (644, 31); line (637, 27.5); close; move (717, 121.5); line (724, 125); line (724, 71); line (717, 67.5); close; move (797, 161.5); line (804, 165);
  line (804, 111); line (797, 107.5); close; move (877, 201.5); line (884, 205); line (884, 151); line (877, 147.5); close; move (957, 241.5); line (964, 245); line (964, 191); line (957, 187.5);
  close; move (1037, 281.5); line (1044, 285); line (1044, 231); line (1037, 227.5); close; move (1117, 321.5); line (1124, 325); line (1124, 271); line (1117, 267.5); close; move (1197, 361.5);
  line (1204, 365); line (1204, 311); line (1197, 307.5); close; move (1277, 401.5); line (1284, 405); line (1284, 351); line (1277, 347.5); close;
};
path rPierSide { zIndex 2; fill #968979;
  move (-300, -403); line (-316, -395); line (-316, -449); line (-300, -457); close; move (-220, -363); line (-236, -355); line (-236, -409); line (-220, -417); close; move (-140, -323); line (-156, -315);
  line (-156, -369); line (-140, -377); close; move (-60, -283); line (-76, -275); line (-76, -329); line (-60, -337); close; move (20, -243); line (4, -235); line (4, -289); line (20, -297);
  close; move (100, -203); line (84, -195); line (84, -249); line (100, -257); close; move (180, -163); line (164, -155); line (164, -209); line (180, -217); close; move (260, -123);
  line (244, -115); line (244, -169); line (260, -177); close; move (340, -83); line (324, -75); line (324, -129); line (340, -137); close; move (420, -43); line (404, -35); line (404, -89);
  line (420, -97); close; move (500, -3); line (484, 5); line (484, -49); line (500, -57); close; move (580, 37); line (564, 45); line (564, -9); line (580, -17); close;
  move (660, 77); line (644, 85); line (644, 31); line (660, 23); close; move (740, 117); line (724, 125); line (724, 71); line (740, 63); close; move (820, 157); line (804, 165);
  line (804, 111); line (820, 103); close; move (900, 197); line (884, 205); line (884, 151); line (900, 143); close; move (980, 237); line (964, 245); line (964, 191); line (980, 183);
  close; move (1060, 277); line (1044, 285); line (1044, 231); line (1060, 223); close; move (1140, 317); line (1124, 325); line (1124, 271); line (1140, 263); close; move (1220, 357);
  line (1204, 365); line (1204, 311); line (1220, 303); close; move (1300, 397); line (1284, 405); line (1284, 351); line (1300, 343); close;
};
path rDeckTop { zIndex 2; fill #8d847b;
  move (-1503, -1068.5); line (2897, 1131.5); line (2873, 1143.5); line (-1527, -1056.5); close;
};
path rDeckFront { zIndex 2; fill #b8ab9b;
  move (-1527, -1050.5); line (2873, 1149.5); line (2873, 1143.5); line (-1527, -1056.5); close;
};
path rTrack { zIndex 2; fill #5f5853;
  move (-1510, -1065); line (2890, 1135); line (2889, 1135.5); line (-1511, -1064.5); close; move (-1519, -1060.5); line (2881, 1139.5); line (2880, 1140); line (-1520, -1060); close;
};
path bFront_back { zIndex 5; fill #c49a7c;
  move (-460, -360); line (-350, -305); line (-350, -431); line (-460, -486); close; move (200, -30); line (300, 20); line (300, -50); line (200, -100); close; move (420, 80); line (530, 135);
  line (530, 9); line (420, -46); close; move (1080, 410); line (1180, 460); line (1180, 390); line (1080, 340); close; move (1300, 520); line (1410, 575); line (1410, 449); line (1300, 394);
  close;
};
path bSide_back { zIndex 5; fill #a27c62;
  move (-270, -345); line (-350, -305); line (-350, -431); line (-270, -471); close; move (380, -20); line (300, 20); line (300, -50); line (380, -90); close; move (610, 95); line (530, 135);
  line (530, 9); line (610, -31); close; move (1260, 420); line (1180, 460); line (1180, 390); line (1260, 350); close;
};
path bFront_rose { zIndex 5; fill #cf8d7a;
  move (300, 20); line (390, 65); line (390, -75); line (300, -120); close; move (1180, 460); line (1270, 505); line (1270, 365); line (1180, 320); close;
};
path bSide_rose { zIndex 5; fill #a96f5f;
  move (470, 25); line (390, 65); line (390, -75); line (470, -115); close; move (1350, 465); line (1270, 505); line (1270, 365); line (1350, 325); close;
};
path bFront_umber { zIndex 5; fill #b9805c;
  move (-50, -155); line (130, -65); line (130, -197); line (-50, -287); close; move (830, 285); line (1010, 375); line (1010, 243); line (830, 153); close;
};
path bSide_umber { zIndex 5; fill #946446;
  move (210, -105); line (130, -65); line (130, -197); line (210, -237); close; move (1090, 335); line (1010, 375); line (1010, 243); line (1090, 203); close;
};
path bRoof { zIndex 5; fill #4a9893;
  move (30, -327); line (210, -237); line (130, -197); line (-50, -287); close; move (280, -140); line (380, -90); line (300, -50); line (200, -100); close; move (380, -160); line (470, -115);
  line (390, -75); line (300, -120); close; move (500, -86); line (610, -31); line (530, 9); line (420, -46); close; move (910, 113); line (1090, 203); line (1010, 243); line (830, 153);
  close; move (1160, 300); line (1260, 350); line (1180, 390); line (1080, 340); close; move (1260, 280); line (1350, 325); line (1270, 365); line (1180, 320); close; move (1380, 354);
  line (1490, 409); line (1410, 449); line (1300, 394); close;
};
path bRoofEdge { zIndex 5; fill #6fb1aa;
  move (-47, -290.5); line (133, -200.5); line (130, -199); line (-50, -289); close; move (-50, -285); line (130, -195); line (130, -199); line (-50, -289); close; move (203, -103.5); line (303, -53.5);
  line (300, -52); line (200, -102); close; move (200, -98); line (300, -48); line (300, -52); line (200, -102); close; move (303, -123.5); line (393, -78.5); line (390, -77); line (300, -122);
  close; move (300, -118); line (390, -73); line (390, -77); line (300, -122); close; move (423, -49.5); line (533, 5.5); line (530, 7); line (420, -48); close; move (420, -44);
  line (530, 11); line (530, 7); line (420, -48); close; move (833, 149.5); line (1013, 239.5); line (1010, 241); line (830, 151); close; move (830, 155); line (1010, 245); line (1010, 241);
  line (830, 151); close; move (1083, 336.5); line (1183, 386.5); line (1180, 388); line (1080, 338); close; move (1080, 342); line (1180, 392); line (1180, 388); line (1080, 338); close;
  move (1183, 316.5); line (1273, 361.5); line (1270, 363); line (1180, 318); close; move (1180, 322); line (1270, 367); line (1270, 363); line (1180, 318); close; move (1303, 390.5); line (1413, 445.5);
  line (1410, 447); line (1300, 392); close; move (1300, 396); line (1410, 451); line (1410, 447); line (1300, 392); close;
};
path bWin { zIndex 5; fill #36505a;
  move (-452, -386); line (-358, -339); line (-358, -351); line (-452, -398); close; move (-284, -368); line (-336, -342); line (-336, -354); line (-284, -380); close; move (-452, -410); line (-358, -363);
  line (-358, -375); line (-452, -422); close; move (-284, -392); line (-336, -366); line (-336, -378); line (-284, -404); close; move (-284, -416); line (-336, -390); line (-336, -402); line (-284, -428);
  close; move (-452, -360); line (-358, -313); line (-358, -329); line (-452, -376); close; move (196, -128); line (144, -102); line (144, -114); line (196, -140); close; move (-42, -205);
  line (122, -123); line (122, -135); line (-42, -217); close; move (196, -152); line (144, -126); line (144, -138); line (196, -164); close; move (-42, -229); line (122, -147); line (122, -159);
  line (-42, -241); close; move (196, -176); line (144, -150); line (144, -162); line (196, -188); close; move (-42, -253); line (122, -171); line (122, -183); line (-42, -265); close;
  move (196, -200); line (144, -174); line (144, -186); line (196, -212); close; move (-42, -155); line (122, -73); line (122, -89); line (-42, -171); close; move (208, -56); line (292, -14);
  line (292, -26); line (208, -68); close; move (366, -43); line (314, -17); line (314, -29); line (366, -55); close; move (208, -30); line (292, 12); line (292, -4); line (208, -46);
  close; move (308, -6); line (382, 31); line (382, 19); line (308, -18); close; move (456, 2); line (404, 28); line (404, 16); line (456, -10); close; move (308, -30);
  line (382, 7); line (382, -5); line (308, -42); close; move (456, -22); line (404, 4); line (404, -8); line (456, -34); close; move (456, -46); line (404, -20); line (404, -32);
  line (456, -58); close; move (308, -78); line (382, -41); line (382, -53); line (308, -90); close; move (456, -70); line (404, -44); line (404, -56); line (456, -82); close;
  move (308, 20); line (382, 57); line (382, 41); line (308, 4); close; move (428, 54); line (522, 101); line (522, 89); line (428, 42); close; move (596, 72); line (544, 98);
  line (544, 86); line (596, 60); close; move (428, 30); line (522, 77); line (522, 65); line (428, 18); close; move (596, 48); line (544, 74); line (544, 62); line (596, 36);
  close; move (596, 24); line (544, 50); line (544, 38); line (596, 12); close; move (428, -18); line (522, 29); line (522, 17); line (428, -30); close; move (596, 0);
  line (544, 26); line (544, 14); line (596, -12); close; move (428, 80); line (522, 127); line (522, 111); line (428, 64); close; move (1076, 312); line (1024, 338); line (1024, 326);
  line (1076, 300); close; move (838, 235); line (1002, 317); line (1002, 305); line (838, 223); close; move (1076, 288); line (1024, 314); line (1024, 302); line (1076, 276); close;
  move (838, 211); line (1002, 293); line (1002, 281); line (838, 199); close; move (1076, 264); line (1024, 290); line (1024, 278); line (1076, 252); close; move (838, 187); line (1002, 269);
  line (1002, 257); line (838, 175); close; move (1076, 240); line (1024, 266); line (1024, 254); line (1076, 228); close; move (838, 285); line (1002, 367); line (1002, 351); line (838, 269);
  close; move (1088, 384); line (1172, 426); line (1172, 414); line (1088, 372); close; move (1246, 397); line (1194, 423); line (1194, 411); line (1246, 385); close; move (1088, 410);
  line (1172, 452); line (1172, 436); line (1088, 394); close; move (1188, 434); line (1262, 471); line (1262, 459); line (1188, 422); close; move (1336, 442); line (1284, 468); line (1284, 456);
  line (1336, 430); close; move (1188, 410); line (1262, 447); line (1262, 435); line (1188, 398); close; move (1336, 418); line (1284, 444); line (1284, 432); line (1336, 406); close;
  move (1336, 394); line (1284, 420); line (1284, 408); line (1336, 382); close; move (1188, 362); line (1262, 399); line (1262, 387); line (1188, 350); close; move (1336, 370); line (1284, 396);
  line (1284, 384); line (1336, 358); close; move (1188, 460); line (1262, 497); line (1262, 481); line (1188, 444); close; move (1308, 494); line (1402, 541); line (1402, 529); line (1308, 482);
  close; move (1308, 470); line (1402, 517); line (1402, 505); line (1308, 458); close; move (1308, 422); line (1402, 469); line (1402, 457); line (1308, 410); close; move (1308, 520);
  line (1402, 567); line (1402, 551); line (1308, 504); close;
};
path bWinLit { zIndex 5; fill #f6d58c;
  move (-452, -434); line (-358, -387); line (-358, -399); line (-452, -446); close; move (-42, -181); line (122, -99); line (122, -111); line (-42, -193); close; move (308, -54); line (382, -17);
  line (382, -29); line (308, -66); close; move (428, 6); line (522, 53); line (522, 41); line (428, -6); close; move (838, 259); line (1002, 341); line (1002, 329); line (838, 247);
  close; move (1188, 386); line (1262, 423); line (1262, 411); line (1188, 374); close; move (1308, 446); line (1402, 493); line (1402, 481); line (1308, 434); close;
};
path bTank { zIndex 5; fill #8c6a4f;
  move (319, -141.5); line (312.58, -139.35); line (305, -138.6); line (297.42, -139.35); line (291, -141.5); line (286.71, -144.71); line (285.2, -148.5); line (286.71, -152.29); line (291, -155.5); line (291, -123.5); line (286.71, -120.29); line (285.2, -116.5);
  line (286.71, -112.71); line (291, -109.5); line (297.42, -107.35); line (305, -106.6); line (312.58, -107.35); line (319, -109.5); close; move (1199, 298.5); line (1192.58, 300.65); line (1185, 301.4); line (1177.42, 300.65); line (1171, 298.5);
  line (1166.71, 295.29); line (1165.2, 291.5); line (1166.71, 287.71); line (1171, 284.5); line (1171, 316.5); line (1166.71, 319.71); line (1165.2, 323.5); line (1166.71, 327.29); line (1171, 330.5); line (1177.42, 332.65); line (1185, 333.4); line (1192.58, 332.65);
  line (1199, 330.5); close;
};
path bTankDark { zIndex 5; fill #6d513c;
  move (305, -127); line (308, -125.5); line (305, -124); line (302, -125.5); close; move (302, -111.5); line (305, -110); line (305, -124); line (302, -125.5); close; move (308, -111.5); line (305, -110);
  line (305, -124); line (308, -125.5); close; move (323, -118); line (326, -116.5); line (323, -115); line (320, -116.5); close; move (320, -102.5); line (323, -101); line (323, -115); line (320, -116.5);
  close; move (326, -102.5); line (323, -101); line (323, -115); line (326, -116.5); close; move (287, -118); line (290, -116.5); line (287, -115); line (284, -116.5); close; move (284, -102.5);
  line (287, -101); line (287, -115); line (284, -116.5); close; move (290, -102.5); line (287, -101); line (287, -115); line (290, -116.5); close; move (305, -109); line (308, -107.5); line (305, -106);
  line (302, -107.5); close; move (302, -93.5); line (305, -92); line (305, -106); line (302, -107.5); close; move (308, -93.5); line (305, -92); line (305, -106); line (308, -107.5); close;
  move (312.58, -139.35); line (305, -138.6); line (297.42, -139.35); line (297.42, -107.35); line (305, -106.6); line (312.58, -107.35); close; move (290, -156); line (305, -160.5); line (320, -141); line (290, -141); close;
  move (1185, 313); line (1188, 314.5); line (1185, 316); line (1182, 314.5); close; move (1182, 328.5); line (1185, 330); line (1185, 316); line (1182, 314.5); close; move (1188, 328.5); line (1185, 330);
  line (1185, 316); line (1188, 314.5); close; move (1203, 322); line (1206, 323.5); line (1203, 325); line (1200, 323.5); close; move (1200, 337.5); line (1203, 339); line (1203, 325); line (1200, 323.5);
  close; move (1206, 337.5); line (1203, 339); line (1203, 325); line (1206, 323.5); close; move (1167, 322); line (1170, 323.5); line (1167, 325); line (1164, 323.5); close; move (1164, 337.5);
  line (1167, 339); line (1167, 325); line (1164, 323.5); close; move (1170, 337.5); line (1167, 339); line (1167, 325); line (1170, 323.5); close; move (1185, 331); line (1188, 332.5); line (1185, 334);
  line (1182, 332.5); close; move (1182, 346.5); line (1185, 348); line (1185, 334); line (1182, 332.5); close; move (1188, 346.5); line (1185, 348); line (1185, 334); line (1188, 332.5); close;
  move (1192.58, 300.65); line (1185, 301.4); line (1177.42, 300.65); line (1177.42, 332.65); line (1185, 333.4); line (1192.58, 332.65); close; move (1170, 284); line (1185, 279.5); line (1200, 299); line (1170, 299); close;
};
path bTankTop { zIndex 5; fill #a8836a;
  move (319, -141.5); line (312.58, -139.35); line (305, -138.6); line (297.42, -139.35); line (291, -141.5); line (286.71, -144.71); line (285.2, -148.5); line (286.71, -152.29); line (291, -155.5); line (297.42, -157.65); line (305, -158.4); line (312.58, -157.65);
  line (319, -155.5); line (323.29, -152.29); line (324.8, -148.5); line (323.29, -144.71); close; move (1199, 298.5); line (1192.58, 300.65); line (1185, 301.4); line (1177.42, 300.65); line (1171, 298.5); line (1166.71, 295.29); line (1165.2, 291.5);
  line (1166.71, 287.71); line (1171, 284.5); line (1177.42, 282.35); line (1185, 281.6); line (1192.58, 282.35); line (1199, 284.5); line (1203.29, 287.71); line (1204.8, 291.5); line (1203.29, 295.29); close;
};
path bTree { zIndex 5; fill #6f9b4f;
  move (-172.9, -308.95); line (-177.45, -304.66); line (-186.55, -304.66); line (-191.1, -308.95); line (-186.55, -313.24); line (-177.45, -313.24); close; move (-142.9, -263.95); line (-147.45, -259.66); line (-156.55, -259.66); line (-161.1, -263.95); line (-156.55, -268.24);
  line (-147.45, -268.24); close; move (-47.9, -251.45); line (-52.45, -247.16); line (-61.55, -247.16); line (-66.1, -251.45); line (-61.55, -255.74); line (-52.45, -255.74); close; move (-52.9, -208.95); line (-57.45, -204.66); line (-66.55, -204.66);
  line (-71.1, -208.95); line (-66.55, -213.24); line (-57.45, -213.24); close; move (707.1, 131.05); line (702.55, 135.34); line (693.45, 135.34); line (688.9, 131.05); line (693.45, 126.76); line (702.55, 126.76); close; move (737.1, 176.05);
  line (732.55, 180.34); line (723.45, 180.34); line (718.9, 176.05); line (723.45, 171.76); line (732.55, 171.76); close; move (832.1, 188.55); line (827.55, 192.84); line (818.45, 192.84); line (813.9, 188.55); line (818.45, 184.26); line (827.55, 184.26);
  close; move (827.1, 231.05); line (822.55, 235.34); line (813.45, 235.34); line (808.9, 231.05); line (813.45, 226.76); line (822.55, 226.76); close;
};
path bTreeDark { zIndex 5; fill #4f7a3e;
  move (-167, -307.7); line (-173.5, -301.03); line (-186.5, -301.03); line (-193, -307.7); line (-186.5, -314.37); line (-173.5, -314.37); close; move (-137, -262.7); line (-143.5, -256.03); line (-156.5, -256.03); line (-163, -262.7); line (-156.5, -269.37);
  line (-143.5, -269.37); close; move (-42, -250.2); line (-48.5, -243.53); line (-61.5, -243.53); line (-68, -250.2); line (-61.5, -256.87); line (-48.5, -256.87); close; move (-47, -207.7); line (-53.5, -201.03); line (-66.5, -201.03);
  line (-73, -207.7); line (-66.5, -214.37); line (-53.5, -214.37); close; move (-380, -86); line (-386, -83); line (-386, -88); line (-380, -91); close; move (-292, -42); line (-298, -39); line (-298, -44);
  line (-292, -47); close; move (-204, 2); line (-210, 5); line (-210, 0); line (-204, -3); close; move (-116, 46); line (-122, 49); line (-122, 44); line (-116, 41); close;
  move (713, 132.3); line (706.5, 138.97); line (693.5, 138.97); line (687, 132.3); line (693.5, 125.63); line (706.5, 125.63); close; move (743, 177.3); line (736.5, 183.97); line (723.5, 183.97); line (717, 177.3); line (723.5, 170.63);
  line (736.5, 170.63); close; move (838, 189.8); line (831.5, 196.47); line (818.5, 196.47); line (812, 189.8); line (818.5, 183.13); line (831.5, 183.13); close; move (833, 232.3); line (826.5, 238.97); line (813.5, 238.97);
  line (807, 232.3); line (813.5, 225.63); line (826.5, 225.63); close; move (-28, 90); line (-34, 93); line (-34, 88); line (-28, 85); close; move (60, 134); line (54, 137); line (54, 132);
  line (60, 129); close; move (148, 178); line (142, 181); line (142, 176); line (148, 173); close; move (236, 222); line (230, 225); line (230, 220); line (236, 217); close;
  move (324, 266); line (318, 269); line (318, 264); line (324, 261); close; move (412, 310); line (406, 313); line (406, 308); line (412, 305); close; move (500, 354); line (494, 357);
  line (494, 352); line (500, 349); close; move (588, 398); line (582, 401); line (582, 396); line (588, 393); close; move (676, 442); line (670, 445); line (670, 440); line (676, 437);
  close; move (764, 486); line (758, 489); line (758, 484); line (764, 481); close; move (852, 530); line (846, 533); line (846, 528); line (852, 525); close; move (940, 574);
  line (934, 577); line (934, 572); line (940, 569); close; move (1028, 618); line (1022, 621); line (1022, 616); line (1028, 613); close;
};
path sSide_terracotta { zIndex 6; fill #a4533b;
  move (-130, -155); line (-220, -110); line (-220, -194); line (-130, -239); close; move (250, 35); line (160, 80); line (160, 20); line (250, -25); close; move (750, 285); line (660, 330);
  line (660, 246); line (750, 201); close; move (124, 238); line (48, 276); line (48, 228); line (124, 190); close; move (330, 455); line (248, 496); line (248, 450); line (330, 409);
  close; move (1130, 475); line (1040, 520); line (1040, 460); line (1130, 415); close;
};
path sSide_ochre { zIndex 6; fill #b07f45;
  move (90, -45); line (0, 0); line (0, -60); line (90, -105); close; move (330, 75); line (240, 120); line (240, 36); line (330, -9); close; move (970, 395); line (880, 440);
  line (880, 380); line (970, 335); close; move (294, 323); line (218, 361); line (218, 327); line (294, 289); close; move (-70, 255); line (-152, 296); line (-152, 250); line (-70, 209);
  close; move (1210, 515); line (1120, 560); line (1120, 476); line (1210, 431); close;
};
path sSide_sand { zIndex 6; fill #bf9f70;
  move (-390, -285); line (-480, -240); line (-480, -324); line (-390, -369); close; move (-10, -95); line (-100, -50); line (-100, -158); line (-10, -203); close; move (490, 155); line (400, 200);
  line (400, 116); line (490, 71); close; move (870, 345); line (780, 390); line (780, 282); line (870, 237); close; move (-26, 163); line (-102, 201); line (-102, 167); line (-26, 129);
  close; move (130, 355); line (48, 396); line (48, 362); line (130, 321); close; move (1370, 595); line (1280, 640); line (1280, 556); line (1370, 511); close; move (854, 603);
  line (778, 641); line (778, 607); line (854, 569); close;
};
path sSide_rose { zIndex 6; fill #a96f5f;
  move (-300, 140); line (-382, 181); line (-382, 147); line (-300, 106); close; move (410, 115); line (320, 160); line (320, 100); line (410, 55); close; move (464, 408); line (388, 446);
  line (388, 398); line (464, 360); close; move (580, 580); line (498, 621); line (498, 587); line (580, 546); close; move (1290, 555); line (1200, 600); line (1200, 540); line (1290, 495);
  close;
};
path sSide_umber { zIndex 6; fill #946446;
  move (-230, -205); line (-320, -160); line (-320, -220); line (-230, -265); close; move (-196, 78); line (-272, 116); line (-272, 82); line (-196, 44); close; move (650, 235); line (560, 280);
  line (560, 220); line (650, 175); close; move (684, 518); line (608, 556); line (608, 522); line (684, 484); close;
};
path sWin { zIndex 6; fill #36505a;
  move (-254, -230); line (-296, -209); line (-296, -219); line (-254, -240); close; move (-154, -180); line (-196, -159); line (-196, -169); line (-154, -190); close; move (-154, -204); line (-196, -183);
  line (-196, -193); line (-154, -214); close; move (-34, -120); line (-76, -99); line (-76, -109); line (-34, -130); close; move (-34, -144); line (-76, -123); line (-76, -133); line (-34, -154);
  close; move (-34, -168); line (-76, -147); line (-76, -157); line (-34, -178); close; move (66, -70); line (24, -49); line (24, -59); line (66, -80); close; move (226, 10);
  line (184, 31); line (184, 21); line (226, 0); close; move (306, 50); line (264, 71); line (264, 61); line (306, 40); close; move (306, 26); line (264, 47); line (264, 37);
  line (306, 16); close; move (386, 90); line (344, 111); line (344, 101); line (386, 80); close; move (466, 130); line (424, 151); line (424, 141); line (466, 120); close;
  move (466, 106); line (424, 127); line (424, 117); line (466, 96); close; move (626, 210); line (584, 231); line (584, 221); line (626, 200); close; move (726, 260); line (684, 281);
  line (684, 271); line (726, 250); close; move (726, 236); line (684, 257); line (684, 247); line (726, 226); close; move (846, 320); line (804, 341); line (804, 331); line (846, 310);
  close; move (846, 296); line (804, 317); line (804, 307); line (846, 286); close; move (846, 272); line (804, 293); line (804, 283); line (846, 262); close; move (946, 370);
  line (904, 391); line (904, 381); line (946, 360); close; move (1106, 450); line (1064, 471); line (1064, 461); line (1106, 440); close; move (1186, 490); line (1144, 511); line (1144, 501);
  line (1186, 480); close; move (1186, 466); line (1144, 487); line (1144, 477); line (1186, 456); close; move (1266, 530); line (1224, 551); line (1224, 541); line (1266, 520); close;
  move (1346, 570); line (1304, 591); line (1304, 581); line (1346, 560); close; move (1346, 546); line (1304, 567); line (1304, 557); line (1346, 536); close;
};
path fr_terracotta { zIndex 8; fill #c8694b;
  move (-320, -160); line (-220, -110); line (-220, -194); line (-320, -244); close; move (560, 280); line (660, 330); line (660, 246); line (560, 196); close; move (-92, 206); line (48, 276);
  line (48, 228); line (-92, 158); close; move (58, 401); line (248, 496); line (248, 450); line (58, 355); close; move (788, 646); line (928, 716); line (928, 668); line (788, 598);
  close;
};
path fr_ochre { zIndex 8; fill #d79f5c;
  move (-100, -50); line (0, 0); line (0, -60); line (-100, -110); close; move (160, 80); line (240, 120); line (240, 36); line (160, -4); close; move (780, 390); line (880, 440);
  line (880, 380); line (780, 330); close; move (58, 281); line (218, 361); line (218, 327); line (58, 247); close; move (-362, 191); line (-152, 296); line (-152, 250); line (-362, 145);
  close; move (1040, 520); line (1120, 560); line (1120, 476); line (1040, 436); close; move (518, 631); line (728, 736); line (728, 690); line (518, 585); close;
};
path fr_sand { zIndex 8; fill #e3c391;
  move (-220, -110); line (-100, -50); line (-100, -158); line (-220, -218); close; move (320, 160); line (400, 200); line (400, 116); line (320, 76); close; move (660, 330); line (780, 390);
  line (780, 282); line (660, 222); close; move (-232, 136); line (-102, 201); line (-102, 167); line (-232, 102); close; move (-142, 301); line (48, 396); line (48, 362); line (-142, 267);
  close; move (1200, 600); line (1280, 640); line (1280, 556); line (1200, 516); close; move (648, 576); line (778, 641); line (778, 607); line (648, 542); close;
};
path fr_rose { zIndex 8; fill #cf8d7a;
  move (-622, 61); line (-382, 181); line (-382, 147); line (-622, 27); close; move (240, 120); line (320, 160); line (320, 100); line (240, 60); close; move (228, 366); line (388, 446);
  line (388, 398); line (228, 318); close; move (258, 501); line (498, 621); line (498, 587); line (258, 467); close; move (1120, 560); line (1200, 600); line (1200, 540); line (1120, 500);
  close;
};
path fr_umber { zIndex 8; fill #b9805c;
  move (-420, -210); line (-320, -160); line (-320, -220); line (-420, -270); close; move (-482, 11); line (-272, 116); line (-272, 82); line (-482, -23); close; move (460, 230); line (560, 280);
  line (560, 220); line (460, 170); close; move (398, 451); line (608, 556); line (608, 522); line (398, 417); close;
};
path frBand { zIndex 8; fill #5b4a40;
  move (-420, -237); line (-320, -187); line (-320, -190); line (-420, -240); close; move (-320, -187); line (-220, -137); line (-220, -140); line (-320, -190); close; move (-220, -137); line (-100, -77);
  line (-100, -80); line (-220, -140); close; move (-100, -77); line (0, -27); line (0, -30); line (-100, -80); close; move (60, 3); line (160, 53); line (160, 50); line (60, 0);
  close; move (160, 53); line (240, 93); line (240, 90); line (160, 50); close; move (240, 93); line (320, 133); line (320, 130); line (240, 90); close; move (320, 133);
  line (400, 173); line (400, 170); line (320, 130); close; move (460, 203); line (560, 253); line (560, 250); line (460, 200); close; move (560, 253); line (660, 303); line (660, 300);
  line (560, 250); close; move (660, 303); line (780, 363); line (780, 360); line (660, 300); close; move (780, 363); line (880, 413); line (880, 410); line (780, 360); close;
  move (940, 443); line (1040, 493); line (1040, 490); line (940, 440); close; move (1040, 493); line (1120, 533); line (1120, 530); line (1040, 490); close; move (1120, 533); line (1200, 573);
  line (1200, 570); line (1120, 530); close; move (1200, 573); line (1280, 613); line (1280, 610); line (1200, 570); close;
};
path frShop { zIndex 8; fill #41575c;
  move (-314, -161); line (-242, -125); line (-242, -144); line (-314, -180); close; move (-214, -111); line (-122, -65); line (-122, -84); line (-214, -130); close; move (-94, -51); line (-22, -15);
  line (-22, -34); line (-94, -70); close; move (166, 79); line (218, 105); line (218, 86); line (166, 60); close; move (246, 119); line (298, 145); line (298, 126); line (246, 100);
  close; move (326, 159); line (378, 185); line (378, 166); line (326, 140); close; move (566, 279); line (638, 315); line (638, 296); line (566, 260); close; move (666, 329);
  line (758, 375); line (758, 356); line (666, 310); close; move (786, 389); line (858, 425); line (858, 406); line (786, 370); close; move (1046, 519); line (1098, 545); line (1098, 526);
  line (1046, 500); close; move (1126, 559); line (1178, 585); line (1178, 566); line (1126, 540); close; move (1206, 599); line (1258, 625); line (1258, 606); line (1206, 580); close;
};
path frShopLit { zIndex 8; fill #f3cf86;
  move (-414, -211); line (-342, -175); line (-342, -194); line (-414, -230); close; move (66, 29); line (138, 65); line (138, 46); line (66, 10); close; move (466, 229); line (538, 265);
  line (538, 246); line (466, 210); close; move (946, 469); line (1018, 505); line (1018, 486); line (946, 450); close;
};
path frDoor { zIndex 8; fill #4b3a30;
  move (-338, -169); line (-328, -164); line (-328, -187); line (-338, -192); close; move (-238, -119); line (-228, -114); line (-228, -137); line (-238, -142); close; move (-118, -59); line (-108, -54);
  line (-108, -77); line (-118, -82); close; move (-18, -9); line (-8, -4); line (-8, -27); line (-18, -32); close; move (142, 71); line (152, 76); line (152, 53); line (142, 48);
  close; move (222, 111); line (232, 116); line (232, 93); line (222, 88); close; move (302, 151); line (312, 156); line (312, 133); line (302, 128); close; move (382, 191);
  line (392, 196); line (392, 173); line (382, 168); close; move (542, 271); line (552, 276); line (552, 253); line (542, 248); close; move (642, 321); line (652, 326); line (652, 303);
  line (642, 298); close; move (762, 381); line (772, 386); line (772, 363); line (762, 358); close; move (862, 431); line (872, 436); line (872, 413); line (862, 408); close;
  move (1022, 511); line (1032, 516); line (1032, 493); line (1022, 488); close; move (1102, 551); line (1112, 556); line (1112, 533); line (1102, 528); close; move (1182, 591); line (1192, 596);
  line (1192, 573); line (1182, 568); close;
};
path frWin { zIndex 8; fill #36505a;
  move (-375, -224.5); line (-345, -209.5); line (-345, -219.5); line (-375, -234.5); close; move (-314, -193); line (-308, -190); line (-308, -202); line (-314, -205); close; move (-303, -187.5); line (-297, -184.5);
  line (-297, -196.5); line (-303, -199.5); close; move (-292, -182); line (-286, -179); line (-286, -191); line (-292, -194); close; move (-252, -162); line (-246, -159); line (-246, -171); line (-252, -174);
  close; move (-314, -217); line (-308, -214); line (-308, -226); line (-314, -229); close; move (-303, -211.5); line (-297, -208.5); line (-297, -220.5); line (-303, -223.5); close; move (-292, -206);
  line (-286, -203); line (-286, -215); line (-292, -218); close; move (-274, -197); line (-268, -194); line (-268, -206); line (-274, -209); close; move (-263, -191.5); line (-257, -188.5); line (-257, -200.5);
  line (-263, -203.5); close; move (-252, -186); line (-246, -183); line (-246, -195); line (-252, -198); close; move (-214, -143); line (-206, -139); line (-206, -151); line (-214, -155); close;
  move (-194, -133); line (-186, -129); line (-186, -141); line (-194, -145); close; move (-154, -113); line (-146, -109); line (-146, -121); line (-154, -125); close; move (-134, -103); line (-126, -99);
  line (-126, -111); line (-134, -115); close; move (-114, -93); line (-106, -89); line (-106, -101); line (-114, -105); close; move (-214, -167); line (-206, -163); line (-206, -175); line (-214, -179);
  close; move (-174, -147); line (-166, -143); line (-166, -155); line (-174, -159); close; move (-134, -127); line (-126, -123); line (-126, -135); line (-134, -139); close; move (-114, -117);
  line (-106, -113); line (-106, -125); line (-114, -129); close; move (-214, -191); line (-206, -187); line (-206, -199); line (-214, -203); close; move (-194, -181); line (-186, -177); line (-186, -189);
  line (-194, -193); close; move (-174, -171); line (-166, -167); line (-166, -179); line (-174, -183); close; move (-154, -161); line (-146, -157); line (-146, -169); line (-154, -173); close;
  move (-134, -151); line (-126, -147); line (-126, -159); line (-134, -163); close; move (-114, -141); line (-106, -137); line (-106, -149); line (-114, -153); close; move (-93, -79.5); line (-87, -76.5);
  line (-87, -93.5); line (-93, -96.5); close; move (-53, -59.5); line (-47, -56.5); line (-47, -73.5); line (-53, -76.5); close; move (-33, -49.5); line (-27, -46.5); line (-27, -63.5); line (-33, -66.5);
  close; move (-13, -39.5); line (-7, -36.5); line (-7, -53.5); line (-13, -56.5); close; move (-474, 3); line (-280, 100); line (-280, 90); line (-474, -7); close; move (-614, 53);
  line (-390, 165); line (-390, 155); line (-614, 43); close; move (66, -3); line (74, 1); line (74, -11); line (66, -15); close; move (106, 17); line (114, 21); line (114, 9);
  line (106, 5); close; move (146, 37); line (154, 41); line (154, 29); line (146, 25); close; move (165, 45.5); line (195, 60.5); line (195, 50.5); line (165, 35.5); close;
  move (205, 65.5); line (235, 80.5); line (235, 70.5); line (205, 55.5); close; move (205, 41.5); line (235, 56.5); line (235, 46.5); line (205, 31.5); close; move (257, 92.5); line (263, 95.5);
  line (263, 83.5); line (257, 80.5); close; move (268, 98); line (274, 101); line (274, 89); line (268, 86); close; move (286, 107); line (292, 110); line (292, 98); line (286, 95);
  close; move (308, 118); line (314, 121); line (314, 109); line (308, 106); close; move (327, 130.5); line (333, 133.5); line (333, 116.5); line (327, 113.5); close; move (367, 150.5);
  line (373, 153.5); line (373, 136.5); line (367, 133.5); close; move (387, 160.5); line (393, 163.5); line (393, 146.5); line (387, 143.5); close; move (327, 106.5); line (333, 109.5); line (333, 92.5);
  line (327, 89.5); close; move (367, 126.5); line (373, 129.5); line (373, 112.5); line (367, 109.5); close; move (387, 136.5); line (393, 139.5); line (393, 122.5); line (387, 119.5); close;
  move (505, 215.5); line (535, 230.5); line (535, 220.5); line (505, 205.5); close; move (566, 247); line (572, 250); line (572, 238); line (566, 235); close; move (577, 252.5); line (583, 255.5);
  line (583, 243.5); line (577, 240.5); close; move (588, 258); line (594, 261); line (594, 249); line (588, 246); close; move (628, 278); line (634, 281); line (634, 269); line (628, 266);
  close; move (566, 223); line (572, 226); line (572, 214); line (566, 211); close; move (577, 228.5); line (583, 231.5); line (583, 219.5); line (577, 216.5); close; move (588, 234);
  line (594, 237); line (594, 225); line (588, 222); close; move (606, 243); line (612, 246); line (612, 234); line (606, 231); close; move (617, 248.5); line (623, 251.5); line (623, 239.5);
  line (617, 236.5); close; move (628, 254); line (634, 257); line (634, 245); line (628, 242); close; move (666, 297); line (674, 301); line (674, 289); line (666, 285); close;
  move (686, 307); line (694, 311); line (694, 299); line (686, 295); close; move (726, 327); line (734, 331); line (734, 319); line (726, 315); close; move (746, 337); line (754, 341);
  line (754, 329); line (746, 325); close; move (766, 347); line (774, 351); line (774, 339); line (766, 335); close; move (666, 273); line (674, 277); line (674, 265); line (666, 261);
  close; move (706, 293); line (714, 297); line (714, 285); line (706, 281); close; move (746, 313); line (754, 317); line (754, 305); line (746, 301); close; move (766, 323);
  line (774, 327); line (774, 315); line (766, 311); close; move (666, 249); line (674, 253); line (674, 241); line (666, 237); close; move (686, 259); line (694, 263); line (694, 251);
  line (686, 247); close; move (706, 269); line (714, 273); line (714, 261); line (706, 257); close; move (726, 279); line (734, 283); line (734, 271); line (726, 267); close;
  move (746, 289); line (754, 293); line (754, 281); line (746, 277); close; move (766, 299); line (774, 303); line (774, 291); line (766, 287); close; move (787, 360.5); line (793, 363.5);
  line (793, 346.5); line (787, 343.5); close; move (827, 380.5); line (833, 383.5); line (833, 366.5); line (827, 363.5); close; move (847, 390.5); line (853, 393.5); line (853, 376.5); line (847, 373.5);
  close; move (867, 400.5); line (873, 403.5); line (873, 386.5); line (867, 383.5); close; move (-224, 128); line (-110, 185); line (-110, 175); line (-224, 118); close; move (-84, 184);
  line (40, 246); line (40, 236); line (-84, 174); close; move (66, 273); line (210, 345); line (210, 335); line (66, 263); close; move (236, 344); line (380, 416); line (380, 406);
  line (236, 334); close; move (406, 443); line (600, 540); line (600, 530); line (406, 433); close; move (-354, 171); line (-160, 268); line (-160, 258); line (-354, 161); close;
  move (-134, 293); line (40, 380); line (40, 370); line (-134, 283); close; move (66, 381); line (240, 468); line (240, 458); line (66, 371); close; move (266, 493); line (490, 605);
  line (490, 595); line (266, 483); close; move (946, 437); line (954, 441); line (954, 429); line (946, 425); close; move (986, 457); line (994, 461); line (994, 449); line (986, 445);
  close; move (1026, 477); line (1034, 481); line (1034, 469); line (1026, 465); close; move (1045, 485.5); line (1075, 500.5); line (1075, 490.5); line (1045, 475.5); close; move (1085, 505.5);
  line (1115, 520.5); line (1115, 510.5); line (1085, 495.5); close; move (1085, 481.5); line (1115, 496.5); line (1115, 486.5); line (1085, 471.5); close; move (1137, 532.5); line (1143, 535.5); line (1143, 523.5);
  line (1137, 520.5); close; move (1148, 538); line (1154, 541); line (1154, 529); line (1148, 526); close; move (1166, 547); line (1172, 550); line (1172, 538); line (1166, 535); close;
  move (1188, 558); line (1194, 561); line (1194, 549); line (1188, 546); close; move (1207, 570.5); line (1213, 573.5); line (1213, 556.5); line (1207, 553.5); close; move (1247, 590.5); line (1253, 593.5);
  line (1253, 576.5); line (1247, 573.5); close; move (1207, 546.5); line (1213, 549.5); line (1213, 532.5); line (1207, 529.5); close; move (1247, 566.5); line (1253, 569.5); line (1253, 552.5); line (1247, 549.5);
  close; move (1267, 576.5); line (1273, 579.5); line (1273, 562.5); line (1267, 559.5); close; move (656, 568); line (770, 625); line (770, 615); line (656, 558); close; move (796, 624);
  line (920, 686); line (920, 676); line (796, 614); close; move (526, 611); line (720, 708); line (720, 698); line (526, 601); close;
};
path frWinLit { zIndex 8; fill #f6d58c;
  move (-415, -244.5); line (-385, -229.5); line (-385, -239.5); line (-415, -254.5); close; move (-274, -173); line (-268, -170); line (-268, -182); line (-274, -185); close; move (-263, -167.5); line (-257, -164.5);
  line (-257, -176.5); line (-263, -179.5); close; move (-174, -123); line (-166, -119); line (-166, -131); line (-174, -135); close; move (-194, -157); line (-186, -153); line (-186, -165); line (-194, -169);
  close; move (-154, -137); line (-146, -133); line (-146, -145); line (-154, -149); close; move (-73, -69.5); line (-67, -66.5); line (-67, -83.5); line (-73, -86.5); close; move (86, 7);
  line (94, 11); line (94, -1); line (86, -5); close; move (126, 27); line (134, 31); line (134, 19); line (126, 15); close; move (165, 21.5); line (195, 36.5); line (195, 26.5);
  line (165, 11.5); close; move (246, 87); line (252, 90); line (252, 78); line (246, 75); close; move (297, 112.5); line (303, 115.5); line (303, 103.5); line (297, 100.5); close;
  move (347, 140.5); line (353, 143.5); line (353, 126.5); line (347, 123.5); close; move (347, 116.5); line (353, 119.5); line (353, 102.5); line (347, 99.5); close; move (465, 195.5); line (495, 210.5);
  line (495, 200.5); line (465, 185.5); close; move (606, 267); line (612, 270); line (612, 258); line (606, 255); close; move (617, 272.5); line (623, 275.5); line (623, 263.5); line (617, 260.5);
  close; move (706, 317); line (714, 321); line (714, 309); line (706, 305); close; move (686, 283); line (694, 287); line (694, 275); line (686, 271); close; move (726, 303);
  line (734, 307); line (734, 295); line (726, 291); close; move (807, 370.5); line (813, 373.5); line (813, 356.5); line (807, 353.5); close; move (966, 447); line (974, 451); line (974, 439);
  line (966, 435); close; move (1006, 467); line (1014, 471); line (1014, 459); line (1006, 455); close; move (1045, 461.5); line (1075, 476.5); line (1075, 466.5); line (1045, 451.5); close;
  move (1126, 527); line (1132, 530); line (1132, 518); line (1126, 515); close; move (1177, 552.5); line (1183, 555.5); line (1183, 543.5); line (1177, 540.5); close; move (1227, 580.5); line (1233, 583.5);
  line (1233, 566.5); line (1227, 563.5); close; move (1227, 556.5); line (1233, 559.5); line (1233, 542.5); line (1227, 539.5); close;
};
path frTrim { zIndex 8; fill #f3e3c9;
  move (-420, -241); line (-320, -191); line (-320, -193); line (-420, -243); close; move (-320, -191); line (-220, -141); line (-220, -143); line (-320, -193); close; move (-320, -215); line (-220, -165);
  line (-220, -167); line (-320, -217); close; move (-220, -141); line (-100, -81); line (-100, -83); line (-220, -143); close; move (-220, -165); line (-100, -105); line (-100, -107); line (-220, -167);
  close; move (-220, -189); line (-100, -129); line (-100, -131); line (-220, -191); close; move (-100, -81); line (0, -31); line (0, -33); line (-100, -83); close; move (60, -1);
  line (160, 49); line (160, 47); line (60, -3); close; move (160, 49); line (240, 89); line (240, 87); line (160, 47); close; move (160, 25); line (240, 65); line (240, 63);
  line (160, 23); close; move (240, 89); line (320, 129); line (320, 127); line (240, 87); close; move (320, 129); line (400, 169); line (400, 167); line (320, 127); close;
  move (320, 105); line (400, 145); line (400, 143); line (320, 103); close; move (460, 199); line (560, 249); line (560, 247); line (460, 197); close; move (560, 249); line (660, 299);
  line (660, 297); line (560, 247); close; move (560, 225); line (660, 275); line (660, 273); line (560, 223); close; move (660, 299); line (780, 359); line (780, 357); line (660, 297);
  close; move (660, 275); line (780, 335); line (780, 333); line (660, 273); close; move (660, 251); line (780, 311); line (780, 309); line (660, 249); close; move (780, 359);
  line (880, 409); line (880, 407); line (780, 357); close; move (940, 439); line (1040, 489); line (1040, 487); line (940, 437); close; move (1040, 489); line (1120, 529); line (1120, 527);
  line (1040, 487); close; move (1040, 465); line (1120, 505); line (1120, 503); line (1040, 463); close; move (1120, 529); line (1200, 569); line (1200, 567); line (1120, 527); close;
  move (1200, 569); line (1280, 609); line (1280, 607); line (1200, 567); close; move (1200, 545); line (1280, 585); line (1280, 583); line (1200, 543); close;
};
path frBalcony { zIndex 8; fill #e9dcc6;
  move (-316, -213); line (-284, -197); line (-291, -193.5); line (-323, -209.5); close; move (-323, -207.5); line (-291, -191.5); line (-291, -193.5); line (-323, -209.5); close; move (-256, -183); line (-224, -167);
  line (-231, -163.5); line (-263, -179.5); close; move (-263, -177.5); line (-231, -161.5); line (-231, -163.5); line (-263, -179.5); close; move (-216, -187); line (-104, -131); line (-111, -127.5); line (-223, -183.5);
  close; move (-223, -181.5); line (-111, -125.5); line (-111, -127.5); line (-223, -183.5); close; move (164, 27); line (196, 43); line (189, 46.5); line (157, 30.5); close; move (157, 32.5);
  line (189, 48.5); line (189, 46.5); line (157, 30.5); close; move (204, 47); line (236, 63); line (229, 66.5); line (197, 50.5); close; move (197, 52.5); line (229, 68.5); line (229, 66.5);
  line (197, 50.5); close; move (324, 107); line (396, 143); line (389, 146.5); line (317, 110.5); close; move (317, 112.5); line (389, 148.5); line (389, 146.5); line (317, 110.5); close;
  move (564, 227); line (596, 243); line (589, 246.5); line (557, 230.5); close; move (557, 232.5); line (589, 248.5); line (589, 246.5); line (557, 230.5); close; move (624, 257); line (656, 273);
  line (649, 276.5); line (617, 260.5); close; move (617, 262.5); line (649, 278.5); line (649, 276.5); line (617, 260.5); close; move (664, 253); line (776, 309); line (769, 312.5); line (657, 256.5);
  close; move (657, 258.5); line (769, 314.5); line (769, 312.5); line (657, 256.5); close; move (1044, 467); line (1076, 483); line (1069, 486.5); line (1037, 470.5); close; move (1037, 472.5);
  line (1069, 488.5); line (1069, 486.5); line (1037, 470.5); close; move (1084, 487); line (1116, 503); line (1109, 506.5); line (1077, 490.5); close; move (1077, 492.5); line (1109, 508.5); line (1109, 506.5);
  line (1077, 490.5); close; move (1204, 547); line (1276, 583); line (1269, 586.5); line (1197, 550.5); close; move (1197, 552.5); line (1269, 588.5); line (1269, 586.5); line (1197, 550.5); close;
};
path frRail { zIndex 8; opacity 0.55; fill #3f3a36;
  move (-323, -209.5); line (-291, -193.5); line (-291, -201.5); line (-323, -217.5); close; move (-263, -179.5); line (-231, -163.5); line (-231, -171.5); line (-263, -187.5); close; move (-223, -183.5); line (-111, -127.5);
  line (-111, -135.5); line (-223, -191.5); close; move (157, 30.5); line (189, 46.5); line (189, 38.5); line (157, 22.5); close; move (197, 50.5); line (229, 66.5); line (229, 58.5); line (197, 42.5);
  close; move (317, 110.5); line (389, 146.5); line (389, 138.5); line (317, 102.5); close; move (557, 230.5); line (589, 246.5); line (589, 238.5); line (557, 222.5); close; move (617, 260.5);
  line (649, 276.5); line (649, 268.5); line (617, 252.5); close; move (657, 256.5); line (769, 312.5); line (769, 304.5); line (657, 248.5); close; move (1037, 470.5); line (1069, 486.5); line (1069, 478.5);
  line (1037, 462.5); close; move (1077, 490.5); line (1109, 506.5); line (1109, 498.5); line (1077, 482.5); close; move (1197, 550.5); line (1269, 586.5); line (1269, 578.5); line (1197, 542.5); close;
};
path frBoxSoil { zIndex 8; fill #a8714d;
  move (-379.5, -218.25); line (-347.5, -202.25); line (-347.5, -205.75); line (-379.5, -221.75); close; move (-419.5, -238.25); line (-387.5, -222.25); line (-387.5, -225.75); line (-419.5, -241.75); close; move (-97.5, -73.25); line (-89.5, -69.25);
  line (-89.5, -72.75); line (-97.5, -76.75); close; move (-57.5, -53.25); line (-49.5, -49.25); line (-49.5, -52.75); line (-57.5, -56.75); close; move (-37.5, -43.25); line (-29.5, -39.25); line (-29.5, -42.75); line (-37.5, -46.75);
  close; move (-17.5, -33.25); line (-9.5, -29.25); line (-9.5, -32.75); line (-17.5, -36.75); close; move (-77.5, -63.25); line (-69.5, -59.25); line (-69.5, -62.75); line (-77.5, -66.75); close; move (61.5, 3.25);
  line (71.5, 8.25); line (71.5, 4.75); line (61.5, -0.25); close; move (101.5, 23.25); line (111.5, 28.25); line (111.5, 24.75); line (101.5, 19.75); close; move (141.5, 43.25); line (151.5, 48.25); line (151.5, 44.75);
  line (141.5, 39.75); close; move (81.5, 13.25); line (91.5, 18.25); line (91.5, 14.75); line (81.5, 9.75); close; move (121.5, 33.25); line (131.5, 38.25); line (131.5, 34.75); line (121.5, 29.75); close;
  move (252.5, 98.75); line (260.5, 102.75); line (260.5, 99.25); line (252.5, 95.25); close; move (263.5, 104.25); line (271.5, 108.25); line (271.5, 104.75); line (263.5, 100.75); close; move (281.5, 113.25); line (289.5, 117.25);
  line (289.5, 113.75); line (281.5, 109.75); close; move (303.5, 124.25); line (311.5, 128.25); line (311.5, 124.75); line (303.5, 120.75); close; move (241.5, 93.25); line (249.5, 97.25); line (249.5, 93.75); line (241.5, 89.75);
  close; move (292.5, 118.75); line (300.5, 122.75); line (300.5, 119.25); line (292.5, 115.25); close; move (500.5, 221.75); line (532.5, 237.75); line (532.5, 234.25); line (500.5, 218.25); close; move (460.5, 201.75);
  line (492.5, 217.75); line (492.5, 214.25); line (460.5, 198.25); close; move (782.5, 366.75); line (790.5, 370.75); line (790.5, 367.25); line (782.5, 363.25); close; move (822.5, 386.75); line (830.5, 390.75); line (830.5, 387.25);
  line (822.5, 383.25); close; move (842.5, 396.75); line (850.5, 400.75); line (850.5, 397.25); line (842.5, 393.25); close; move (862.5, 406.75); line (870.5, 410.75); line (870.5, 407.25); line (862.5, 403.25); close;
  move (802.5, 376.75); line (810.5, 380.75); line (810.5, 377.25); line (802.5, 373.25); close; move (941.5, 443.25); line (951.5, 448.25); line (951.5, 444.75); line (941.5, 439.75); close; move (981.5, 463.25); line (991.5, 468.25);
  line (991.5, 464.75); line (981.5, 459.75); close; move (1021.5, 483.25); line (1031.5, 488.25); line (1031.5, 484.75); line (1021.5, 479.75); close; move (961.5, 453.25); line (971.5, 458.25); line (971.5, 454.75); line (961.5, 449.75);
  close; move (1001.5, 473.25); line (1011.5, 478.25); line (1011.5, 474.75); line (1001.5, 469.75); close; move (1132.5, 538.75); line (1140.5, 542.75); line (1140.5, 539.25); line (1132.5, 535.25); close; move (1143.5, 544.25);
  line (1151.5, 548.25); line (1151.5, 544.75); line (1143.5, 540.75); close; move (1161.5, 553.25); line (1169.5, 557.25); line (1169.5, 553.75); line (1161.5, 549.75); close; move (1183.5, 564.25); line (1191.5, 568.25); line (1191.5, 564.75);
  line (1183.5, 560.75); close; move (1121.5, 533.25); line (1129.5, 537.25); line (1129.5, 533.75); line (1121.5, 529.75); close; move (1172.5, 558.75); line (1180.5, 562.75); line (1180.5, 559.25); line (1172.5, 555.25); close;
};
path frBoxLeaf { zIndex 8; fill #6f9b4f;
  move (-379.5, -221.75); line (-347.5, -205.75); line (-348.5, -209.25); line (-363.5, -218.25); line (-378.5, -224.25); close; move (-419.5, -241.75); line (-387.5, -225.75); line (-388.5, -229.25); line (-403.5, -238.25); line (-418.5, -244.25); close;
  move (-97.5, -76.75); line (-89.5, -72.75); line (-90.5, -76.25); line (-93.5, -79.25); line (-96.5, -79.25); close; move (-57.5, -56.75); line (-49.5, -52.75); line (-50.5, -56.25); line (-53.5, -59.25); line (-56.5, -59.25); close;
  move (-37.5, -46.75); line (-29.5, -42.75); line (-30.5, -46.25); line (-33.5, -49.25); line (-36.5, -49.25); close; move (-17.5, -36.75); line (-9.5, -32.75); line (-10.5, -36.25); line (-13.5, -39.25); line (-16.5, -39.25); close;
  move (-77.5, -66.75); line (-69.5, -62.75); line (-70.5, -66.25); line (-73.5, -69.25); line (-76.5, -69.25); close; move (61.5, -0.25); line (71.5, 4.75); line (70.5, 1.25); line (66.5, -2.25); line (62.5, -2.75); close;
  move (101.5, 19.75); line (111.5, 24.75); line (110.5, 21.25); line (106.5, 17.75); line (102.5, 17.25); close; move (141.5, 39.75); line (151.5, 44.75); line (150.5, 41.25); line (146.5, 37.75); line (142.5, 37.25); close;
  move (81.5, 9.75); line (91.5, 14.75); line (90.5, 11.25); line (86.5, 7.75); line (82.5, 7.25); close; move (121.5, 29.75); line (131.5, 34.75); line (130.5, 31.25); line (126.5, 27.75); line (122.5, 27.25); close;
  move (252.5, 95.25); line (260.5, 99.25); line (259.5, 95.75); line (256.5, 92.75); line (253.5, 92.75); close; move (263.5, 100.75); line (271.5, 104.75); line (270.5, 101.25); line (267.5, 98.25); line (264.5, 98.25); close;
  move (281.5, 109.75); line (289.5, 113.75); line (288.5, 110.25); line (285.5, 107.25); line (282.5, 107.25); close; move (303.5, 120.75); line (311.5, 124.75); line (310.5, 121.25); line (307.5, 118.25); line (304.5, 118.25); close;
  move (241.5, 89.75); line (249.5, 93.75); line (248.5, 90.25); line (245.5, 87.25); line (242.5, 87.25); close; move (292.5, 115.25); line (300.5, 119.25); line (299.5, 115.75); line (296.5, 112.75); line (293.5, 112.75); close;
  move (500.5, 218.25); line (532.5, 234.25); line (531.5, 230.75); line (516.5, 221.75); line (501.5, 215.75); close; move (460.5, 198.25); line (492.5, 214.25); line (491.5, 210.75); line (476.5, 201.75); line (461.5, 195.75); close;
  move (782.5, 363.25); line (790.5, 367.25); line (789.5, 363.75); line (786.5, 360.75); line (783.5, 360.75); close; move (822.5, 383.25); line (830.5, 387.25); line (829.5, 383.75); line (826.5, 380.75); line (823.5, 380.75); close;
  move (842.5, 393.25); line (850.5, 397.25); line (849.5, 393.75); line (846.5, 390.75); line (843.5, 390.75); close; move (862.5, 403.25); line (870.5, 407.25); line (869.5, 403.75); line (866.5, 400.75); line (863.5, 400.75); close;
  move (802.5, 373.25); line (810.5, 377.25); line (809.5, 373.75); line (806.5, 370.75); line (803.5, 370.75); close; move (941.5, 439.75); line (951.5, 444.75); line (950.5, 441.25); line (946.5, 437.75); line (942.5, 437.25); close;
  move (981.5, 459.75); line (991.5, 464.75); line (990.5, 461.25); line (986.5, 457.75); line (982.5, 457.25); close; move (1021.5, 479.75); line (1031.5, 484.75); line (1030.5, 481.25); line (1026.5, 477.75); line (1022.5, 477.25); close;
  move (961.5, 449.75); line (971.5, 454.75); line (970.5, 451.25); line (966.5, 447.75); line (962.5, 447.25); close; move (1001.5, 469.75); line (1011.5, 474.75); line (1010.5, 471.25); line (1006.5, 467.75); line (1002.5, 467.25); close;
  move (1132.5, 535.25); line (1140.5, 539.25); line (1139.5, 535.75); line (1136.5, 532.75); line (1133.5, 532.75); close; move (1143.5, 540.75); line (1151.5, 544.75); line (1150.5, 541.25); line (1147.5, 538.25); line (1144.5, 538.25); close;
  move (1161.5, 549.75); line (1169.5, 553.75); line (1168.5, 550.25); line (1165.5, 547.25); line (1162.5, 547.25); close; move (1183.5, 560.75); line (1191.5, 564.75); line (1190.5, 561.25); line (1187.5, 558.25); line (1184.5, 558.25); close;
  move (1121.5, 529.75); line (1129.5, 533.75); line (1128.5, 530.25); line (1125.5, 527.25); line (1122.5, 527.25); close; move (1172.5, 555.25); line (1180.5, 559.25); line (1179.5, 555.75); line (1176.5, 552.75); line (1173.5, 552.75); close;
};
path rfRoof { zIndex 8; fill #4a9893;
  move (-470, -404); line (-390, -364); line (-480, -319); line (-560, -359); close; move (-330, -310); line (-230, -260); line (-320, -215); line (-420, -265); close; move (-230, -284); line (-130, -234);
  line (-220, -189); line (-320, -239); close; move (-130, -258); line (-10, -198); line (-100, -153); line (-220, -213); close; move (-10, -150); line (90, -100); line (0, -55); line (-100, -105);
  close; move (-406, -61); line (-196, 44); line (-272, 82); line (-482, -23); close; move (-540, -14); line (-300, 106); line (-382, 147); line (-622, 27); close; move (150, -70);
  line (250, -20); line (160, 25); line (60, -25); close; move (250, -44); line (330, -4); line (240, 41); line (160, 1); close; move (330, 20); line (410, 60); line (320, 105);
  line (240, 65); close; move (410, 36); line (490, 76); line (400, 121); line (320, 81); close; move (550, 130); line (650, 180); line (560, 225); line (460, 175); close;
  move (650, 156); line (750, 206); line (660, 251); line (560, 201); close; move (750, 182); line (870, 242); line (780, 287); line (660, 227); close; move (870, 290); line (970, 340);
  line (880, 385); line (780, 335); close; move (-156, 64); line (-26, 129); line (-102, 167); line (-232, 102); close; move (-16, 120); line (124, 190); line (48, 228); line (-92, 158);
  close; move (134, 209); line (294, 289); line (218, 327); line (58, 247); close; move (304, 280); line (464, 360); line (388, 398); line (228, 318); close; move (474, 379);
  line (684, 484); line (608, 522); line (398, 417); close; move (-280, 104); line (-70, 209); line (-152, 250); line (-362, 145); close; move (-60, 226); line (130, 321); line (48, 362);
  line (-142, 267); close; move (140, 314); line (330, 409); line (248, 450); line (58, 355); close; move (340, 426); line (580, 546); line (498, 587); line (258, 467); close;
  move (1030, 370); line (1130, 420); line (1040, 465); line (940, 415); close; move (1130, 396); line (1210, 436); line (1120, 481); line (1040, 441); close; move (1210, 460); line (1290, 500);
  line (1200, 545); line (1120, 505); close; move (1290, 476); line (1370, 516); line (1280, 561); line (1200, 521); close; move (724, 504); line (854, 569); line (778, 607); line (648, 542);
  close; move (864, 560); line (1004, 630); line (928, 668); line (788, 598); close; move (600, 544); line (810, 649); line (728, 690); line (518, 585); close;
};
path rfParapetTop { zIndex 8; fill #6fb1aa;
  move (-417, -271.5); line (-317, -221.5); line (-320, -220); line (-420, -270); close; move (-317, -245.5); line (-217, -195.5); line (-220, -194); line (-320, -244); close; move (-217, -219.5); line (-97, -159.5);
  line (-100, -158); line (-220, -218); close; move (-97, -111.5); line (3, -61.5); line (0, -60); line (-100, -110); close; move (-406, -63); line (-196, 42); line (-199, 43.5); line (-409, -61.5);
  close; move (-540, -16); line (-300, 104); line (-303, 105.5); line (-543, -14.5); close; move (63, -31.5); line (163, 18.5); line (160, 20); line (60, -30); close; move (163, -5.5);
  line (243, 34.5); line (240, 36); line (160, -4); close; move (243, 58.5); line (323, 98.5); line (320, 100); line (240, 60); close; move (323, 74.5); line (403, 114.5); line (400, 116);
  line (320, 76); close; move (463, 168.5); line (563, 218.5); line (560, 220); line (460, 170); close; move (563, 194.5); line (663, 244.5); line (660, 246); line (560, 196); close;
  move (663, 220.5); line (783, 280.5); line (780, 282); line (660, 222); close; move (783, 328.5); line (883, 378.5); line (880, 380); line (780, 330); close; move (-156, 62); line (-26, 127);
  line (-29, 128.5); line (-159, 63.5); close; move (-16, 118); line (124, 188); line (121, 189.5); line (-19, 119.5); close; move (134, 207); line (294, 287); line (291, 288.5); line (131, 208.5);
  close; move (304, 278); line (464, 358); line (461, 359.5); line (301, 279.5); close; move (474, 377); line (684, 482); line (681, 483.5); line (471, 378.5); close; move (-280, 102);
  line (-70, 207); line (-73, 208.5); line (-283, 103.5); close; move (-60, 224); line (130, 319); line (127, 320.5); line (-63, 225.5); close; move (140, 312); line (330, 407); line (327, 408.5);
  line (137, 313.5); close; move (340, 424); line (580, 544); line (577, 545.5); line (337, 425.5); close; move (943, 408.5); line (1043, 458.5); line (1040, 460); line (940, 410); close;
  move (1043, 434.5); line (1123, 474.5); line (1120, 476); line (1040, 436); close; move (1123, 498.5); line (1203, 538.5); line (1200, 540); line (1120, 500); close; move (1203, 514.5); line (1283, 554.5);
  line (1280, 556); line (1200, 516); close; move (724, 502); line (854, 567); line (851, 568.5); line (721, 503.5); close; move (864, 558); line (1004, 628); line (1001, 629.5); line (861, 559.5);
  close; move (600, 542); line (810, 647); line (807, 648.5); line (597, 543.5); close;
};
path rfParapet { zIndex 8; fill #226a68;
  move (-473, -402.5); line (-393, -362.5); line (-393, -367.5); line (-473, -407.5); close; move (-417, -266.5); line (-317, -216.5); line (-317, -221.5); line (-417, -271.5); close; move (-333, -308.5); line (-233, -258.5);
  line (-233, -263.5); line (-333, -313.5); close; move (-317, -240.5); line (-217, -190.5); line (-217, -195.5); line (-317, -245.5); close; move (-233, -282.5); line (-133, -232.5); line (-133, -237.5); line (-233, -287.5);
  close; move (-217, -214.5); line (-97, -154.5); line (-97, -159.5); line (-217, -219.5); close; move (-133, -256.5); line (-13, -196.5); line (-13, -201.5); line (-133, -261.5); close; move (-97, -106.5);
  line (3, -56.5); line (3, -61.5); line (-97, -111.5); close; move (-13, -148.5); line (87, -98.5); line (87, -103.5); line (-13, -153.5); close; move (63, -26.5); line (163, 23.5); line (163, 18.5);
  line (63, -31.5); close; move (147, -68.5); line (247, -18.5); line (247, -23.5); line (147, -73.5); close; move (163, -0.5); line (243, 39.5); line (243, 34.5); line (163, -5.5); close;
  move (247, -42.5); line (327, -2.5); line (327, -7.5); line (247, -47.5); close; move (243, 63.5); line (323, 103.5); line (323, 98.5); line (243, 58.5); close; move (327, 21.5); line (407, 61.5);
  line (407, 56.5); line (327, 16.5); close; move (323, 79.5); line (403, 119.5); line (403, 114.5); line (323, 74.5); close; move (407, 37.5); line (487, 77.5); line (487, 72.5); line (407, 32.5);
  close; move (463, 173.5); line (563, 223.5); line (563, 218.5); line (463, 168.5); close; move (547, 131.5); line (647, 181.5); line (647, 176.5); line (547, 126.5); close; move (563, 199.5);
  line (663, 249.5); line (663, 244.5); line (563, 194.5); close; move (647, 157.5); line (747, 207.5); line (747, 202.5); line (647, 152.5); close; move (663, 225.5); line (783, 285.5); line (783, 280.5);
  line (663, 220.5); close; move (747, 183.5); line (867, 243.5); line (867, 238.5); line (747, 178.5); close; move (783, 333.5); line (883, 383.5); line (883, 378.5); line (783, 328.5); close;
  move (867, 291.5); line (967, 341.5); line (967, 336.5); line (867, 286.5); close; move (943, 413.5); line (1043, 463.5); line (1043, 458.5); line (943, 408.5); close; move (1027, 371.5); line (1127, 421.5);
  line (1127, 416.5); line (1027, 366.5); close; move (1043, 439.5); line (1123, 479.5); line (1123, 474.5); line (1043, 434.5); close; move (1127, 397.5); line (1207, 437.5); line (1207, 432.5); line (1127, 392.5);
  close; move (1123, 503.5); line (1203, 543.5); line (1203, 538.5); line (1123, 498.5); close; move (1207, 461.5); line (1287, 501.5); line (1287, 496.5); line (1207, 456.5); close; move (1203, 519.5);
  line (1283, 559.5); line (1283, 554.5); line (1203, 514.5); close; move (1287, 477.5); line (1367, 517.5); line (1367, 512.5); line (1287, 472.5); close;
};
path rpBed { zIndex 9; fill #a8714d;
  move (-20, -135); line (50, -100); line (50, -105); line (-20, -140); close; move (-70, -110); line (-60, -105); line (-60, -110); line (-70, -115); close; move (-422, -3); line (-292, 62);
  line (-292, 58); line (-422, -7); close; move (-562, 47); line (-402, 127); line (-402, 123); line (-562, 43); close; move (135, -52.5); line (183, -28.5); line (183, -33.5); line (135, -57.5);
  close; move (117, -43.5); line (165, -19.5); line (165, -24.5); line (117, -48.5); close; move (263, 62.5); line (277, 69.5); line (277, 63.5); line (263, 56.5); close; move (299, 80.5);
  line (313, 87.5); line (313, 81.5); line (299, 74.5); close; move (860, 305); line (930, 340); line (930, 335); line (860, 300); close; move (810, 330); line (820, 335); line (820, 330);
  line (810, 325); close; move (-172, 122); line (-122, 147); line (-122, 143); line (-172, 118); close; move (-32, 178); line (28, 208); line (28, 204); line (-32, 174); close;
  move (118, 267); line (198, 307); line (198, 303); line (118, 263); close; move (288, 338); line (368, 378); line (368, 374); line (288, 334); close; move (458, 437); line (588, 502);
  line (588, 498); line (458, 433); close; move (-302, 165); line (-172, 230); line (-172, 226); line (-302, 161); close; move (-82, 287); line (28, 342); line (28, 338); line (-82, 283);
  close; move (118, 375); line (228, 430); line (228, 426); line (118, 371); close; move (318, 487); line (478, 567); line (478, 563); line (318, 483); close; move (1015, 387.5);
  line (1063, 411.5); line (1063, 406.5); line (1015, 382.5); close; move (997, 396.5); line (1045, 420.5); line (1045, 415.5); line (997, 391.5); close; move (1143, 502.5); line (1157, 509.5); line (1157, 503.5);
  line (1143, 496.5); close; move (1179, 520.5); line (1193, 527.5); line (1193, 521.5); line (1179, 514.5); close; move (708, 562); line (758, 587); line (758, 583); line (708, 558); close;
  move (848, 618); line (908, 648); line (908, 644); line (848, 614); close; move (578, 605); line (708, 670); line (708, 666); line (578, 601); close;
};
path rpBedSide { zIndex 9; fill #8a5a3c;
  move (60, -105); line (50, -100); line (50, -105); line (60, -110); close; move (-10, -130); line (-60, -105); line (-60, -110); line (-10, -135); close; move (-284, 58); line (-292, 62);
  line (-292, 58); line (-284, 54); close; move (-394, 123); line (-402, 127); line (-402, 123); line (-394, 119); close; move (192, -33); line (183, -28.5); line (183, -33.5); line (192, -38);
  close; move (174, -24); line (165, -19.5); line (165, -24.5); line (174, -29); close; move (309, 53.5); line (277, 69.5); line (277, 63.5); line (309, 47.5); close; move (345, 71.5);
  line (313, 87.5); line (313, 81.5); line (345, 65.5); close; move (940, 335); line (930, 340); line (930, 335); line (940, 330); close; move (870, 310); line (820, 335); line (820, 330);
  line (870, 305); close; move (-114, 143); line (-122, 147); line (-122, 143); line (-114, 139); close; move (36, 204); line (28, 208); line (28, 204); line (36, 200); close;
  move (206, 303); line (198, 307); line (198, 303); line (206, 299); close; move (376, 374); line (368, 378); line (368, 374); line (376, 370); close; move (596, 498); line (588, 502);
  line (588, 498); line (596, 494); close; move (-164, 226); line (-172, 230); line (-172, 226); line (-164, 222); close; move (36, 338); line (28, 342); line (28, 338); line (36, 334);
  close; move (236, 426); line (228, 430); line (228, 426); line (236, 422); close; move (486, 563); line (478, 567); line (478, 563); line (486, 559); close; move (1072, 407);
  line (1063, 411.5); line (1063, 406.5); line (1072, 402); close; move (1054, 416); line (1045, 420.5); line (1045, 415.5); line (1054, 411); close; move (1189, 493.5); line (1157, 509.5); line (1157, 503.5);
  line (1189, 487.5); close; move (1225, 511.5); line (1193, 527.5); line (1193, 521.5); line (1225, 505.5); close; move (766, 583); line (758, 587); line (758, 583); line (766, 579); close;
};
path rpSoil { zIndex 9; fill #8a5b3c;
  move (-10, -145); line (60, -110); line (50, -105); line (-20, -140); close; move (-20, -140); line (-10, -135); line (-60, -110); line (-70, -115); close; move (-414, -11); line (-284, 54);
  line (-292, 58); line (-422, -7); close; move (-554, 39); line (-394, 119); line (-402, 123); line (-562, 43); close; move (144, -62); line (192, -38); line (183, -33.5); line (135, -57.5);
  close; move (126, -53); line (174, -29); line (165, -24.5); line (117, -48.5); close; move (295, 40.5); line (309, 47.5); line (277, 63.5); line (263, 56.5); close; move (331, 58.5);
  line (345, 65.5); line (313, 81.5); line (299, 74.5); close; move (870, 295); line (940, 330); line (930, 335); line (860, 300); close; move (860, 300); line (870, 305); line (820, 330);
  line (810, 325); close; move (-164, 114); line (-114, 139); line (-122, 143); line (-172, 118); close; move (-24, 170); line (36, 200); line (28, 204); line (-32, 174); close;
  move (126, 259); line (206, 299); line (198, 303); line (118, 263); close; move (296, 330); line (376, 370); line (368, 374); line (288, 334); close; move (466, 429); line (596, 494);
  line (588, 498); line (458, 433); close; move (-294, 157); line (-164, 222); line (-172, 226); line (-302, 161); close; move (-74, 279); line (36, 334); line (28, 338); line (-82, 283);
  close; move (126, 367); line (236, 422); line (228, 426); line (118, 371); close; move (326, 479); line (486, 559); line (478, 563); line (318, 483); close; move (1024, 378);
  line (1072, 402); line (1063, 406.5); line (1015, 382.5); close; move (1006, 387); line (1054, 411); line (1045, 415.5); line (997, 391.5); close; move (1175, 480.5); line (1189, 487.5); line (1157, 503.5);
  line (1143, 496.5); close; move (1211, 498.5); line (1225, 505.5); line (1193, 521.5); line (1179, 514.5); close; move (716, 554); line (766, 579); line (758, 583); line (708, 558); close;
  move (856, 610); line (916, 640); line (908, 644); line (848, 614); close; move (586, 597); line (716, 662); line (708, 666); line (578, 601); close;
};
path rpLeaf { zIndex 9; fill #6f9b4f;
  move (-327.45, -300.3); line (-329.73, -297.44); line (-334.27, -297.44); line (-336.55, -300.3); line (-334.27, -303.16); line (-329.73, -303.16); close; move (-320.45, -296.8); line (-322.73, -293.94); line (-327.27, -293.94); line (-329.55, -296.8); line (-327.27, -299.66);
  line (-322.73, -299.66); close; move (-313.45, -293.3); line (-315.73, -290.44); line (-320.27, -290.44); line (-322.55, -293.3); line (-320.27, -296.16); line (-315.73, -296.16); close; move (-306.45, -289.8); line (-308.73, -286.94); line (-313.27, -286.94);
  line (-315.55, -289.8); line (-313.27, -292.66); line (-308.73, -292.66); close; move (-339.45, -294.3); line (-341.73, -291.44); line (-346.27, -291.44); line (-348.55, -294.3); line (-346.27, -297.16); line (-341.73, -297.16); close; move (-332.45, -290.8);
  line (-334.73, -287.94); line (-339.27, -287.94); line (-341.55, -290.8); line (-339.27, -293.66); line (-334.73, -293.66); close; move (-325.45, -287.3); line (-327.73, -284.44); line (-332.27, -284.44); line (-334.55, -287.3); line (-332.27, -290.16); line (-327.73, -290.16);
  close; move (-318.45, -283.8); line (-320.73, -280.94); line (-325.27, -280.94); line (-327.55, -283.8); line (-325.27, -286.66); line (-320.73, -286.66); close; move (-450, -126); line (-380, -91); line (-386, -88); line (-456, -123);
  close; move (-362, -82); line (-292, -47); line (-298, -44); line (-368, -79); close; move (-274, -38); line (-204, -3); line (-210, 0); line (-280, -35); close; move (-186, 6);
  line (-116, 41); line (-122, 44); line (-192, 9); close; move (151.22, -60.05); line (148.36, -57.19); line (142.64, -57.19); line (139.78, -60.05); line (142.64, -62.91); line (148.36, -62.91); close; move (161.22, -55.05);
  line (158.36, -52.19); line (152.64, -52.19); line (149.78, -55.05); line (152.64, -57.91); line (158.36, -57.91); close; move (171.22, -50.05); line (168.36, -47.19); line (162.64, -47.19); line (159.78, -50.05); line (162.64, -52.91); line (168.36, -52.91);
  close; move (181.22, -45.05); line (178.36, -42.19); line (172.64, -42.19); line (169.78, -45.05); line (172.64, -47.91); line (178.36, -47.91); close; move (191.22, -40.05); line (188.36, -37.19); line (182.64, -37.19); line (179.78, -40.05);
  line (182.64, -42.91); line (188.36, -42.91); close; move (133.22, -51.05); line (130.36, -48.19); line (124.64, -48.19); line (121.78, -51.05); line (124.64, -53.91); line (130.36, -53.91); close; move (143.22, -46.05); line (140.36, -43.19);
  line (134.64, -43.19); line (131.78, -46.05); line (134.64, -48.91); line (140.36, -48.91); close; move (153.22, -41.05); line (150.36, -38.19); line (144.64, -38.19); line (141.78, -41.05); line (144.64, -43.91); line (150.36, -43.91); close;
  move (163.22, -36.05); line (160.36, -33.19); line (154.64, -33.19); line (151.78, -36.05); line (154.64, -38.91); line (160.36, -38.91); close; move (173.22, -31.05); line (170.36, -28.19); line (164.64, -28.19); line (161.78, -31.05); line (164.64, -33.91);
  line (170.36, -33.91); close; move (552.55, 139.7); line (550.27, 142.56); line (545.73, 142.56); line (543.45, 139.7); line (545.73, 136.84); line (550.27, 136.84); close; move (559.55, 143.2); line (557.27, 146.06); line (552.73, 146.06);
  line (550.45, 143.2); line (552.73, 140.34); line (557.27, 140.34); close; move (566.55, 146.7); line (564.27, 149.56); line (559.73, 149.56); line (557.45, 146.7); line (559.73, 143.84); line (564.27, 143.84); close; move (573.55, 150.2);
  line (571.27, 153.06); line (566.73, 153.06); line (564.45, 150.2); line (566.73, 147.34); line (571.27, 147.34); close; move (540.55, 145.7); line (538.27, 148.56); line (533.73, 148.56); line (531.45, 145.7); line (533.73, 142.84); line (538.27, 142.84);
  close; move (547.55, 149.2); line (545.27, 152.06); line (540.73, 152.06); line (538.45, 149.2); line (540.73, 146.34); line (545.27, 146.34); close; move (554.55, 152.7); line (552.27, 155.56); line (547.73, 155.56); line (545.45, 152.7);
  line (547.73, 149.84); line (552.27, 149.84); close; move (561.55, 156.2); line (559.27, 159.06); line (554.73, 159.06); line (552.45, 156.2); line (554.73, 153.34); line (559.27, 153.34); close; move (-98, 50); line (-28, 85);
  line (-34, 88); line (-104, 53); close; move (-10, 94); line (60, 129); line (54, 132); line (-16, 97); close; move (78, 138); line (148, 173); line (142, 176); line (72, 141);
  close; move (166, 182); line (236, 217); line (230, 220); line (160, 185); close; move (254, 226); line (324, 261); line (318, 264); line (248, 229); close; move (342, 270);
  line (412, 305); line (406, 308); line (336, 273); close; move (430, 314); line (500, 349); line (494, 352); line (424, 317); close; move (518, 358); line (588, 393); line (582, 396);
  line (512, 361); close; move (606, 402); line (676, 437); line (670, 440); line (600, 405); close; move (694, 446); line (764, 481); line (758, 484); line (688, 449); close;
  move (1031.22, 379.95); line (1028.36, 382.81); line (1022.64, 382.81); line (1019.78, 379.95); line (1022.64, 377.09); line (1028.36, 377.09); close; move (1041.22, 384.95); line (1038.36, 387.81); line (1032.64, 387.81); line (1029.78, 384.95); line (1032.64, 382.09);
  line (1038.36, 382.09); close; move (1051.22, 389.95); line (1048.36, 392.81); line (1042.64, 392.81); line (1039.78, 389.95); line (1042.64, 387.09); line (1048.36, 387.09); close; move (1061.22, 394.95); line (1058.36, 397.81); line (1052.64, 397.81);
  line (1049.78, 394.95); line (1052.64, 392.09); line (1058.36, 392.09); close; move (1071.22, 399.95); line (1068.36, 402.81); line (1062.64, 402.81); line (1059.78, 399.95); line (1062.64, 397.09); line (1068.36, 397.09); close; move (1013.22, 388.95);
  line (1010.36, 391.81); line (1004.64, 391.81); line (1001.78, 388.95); line (1004.64, 386.09); line (1010.36, 386.09); close; move (1023.22, 393.95); line (1020.36, 396.81); line (1014.64, 396.81); line (1011.78, 393.95); line (1014.64, 391.09); line (1020.36, 391.09);
  close; move (1033.22, 398.95); line (1030.36, 401.81); line (1024.64, 401.81); line (1021.78, 398.95); line (1024.64, 396.09); line (1030.36, 396.09); close; move (1043.22, 403.95); line (1040.36, 406.81); line (1034.64, 406.81); line (1031.78, 403.95);
  line (1034.64, 401.09); line (1040.36, 401.09); close; move (1053.22, 408.95); line (1050.36, 411.81); line (1044.64, 411.81); line (1041.78, 408.95); line (1044.64, 406.09); line (1050.36, 406.09); close; move (782, 490); line (852, 525);
  line (846, 528); line (776, 493); close; move (870, 534); line (940, 569); line (934, 572); line (864, 537); close; move (958, 578); line (1028, 613); line (1022, 616); line (952, 581);
  close; move (1046, 622); line (1116, 657); line (1110, 660); line (1040, 625); close;
};
path rpLeafDark { zIndex 9; fill #4f7a3e;
  move (-456, -118); line (-386, -83); line (-386, -88); line (-456, -123); close; move (-368, -74); line (-298, -39); line (-298, -44); line (-368, -79); close; move (-280, -30); line (-210, 5);
  line (-210, 0); line (-280, -35); close; move (-192, 14); line (-122, 49); line (-122, 44); line (-192, 9); close; move (300.16, 44.52); line (298.08, 46.67); line (293.92, 46.67); line (291.84, 44.52);
  line (293.92, 42.38); line (298.08, 42.38); close; move (293.16, 48.02); line (291.08, 50.17); line (286.92, 50.17); line (284.84, 48.02); line (286.92, 45.88); line (291.08, 45.88); close; move (286.16, 51.52); line (284.08, 53.67);
  line (279.92, 53.67); line (277.84, 51.52); line (279.92, 49.38); line (284.08, 49.38); close; move (279.16, 55.02); line (277.08, 57.17); line (272.92, 57.17); line (270.84, 55.02); line (272.92, 52.88); line (277.08, 52.88); close;
  move (336.16, 62.52); line (334.08, 64.67); line (329.92, 64.67); line (327.84, 62.52); line (329.92, 60.38); line (334.08, 60.38); close; move (329.16, 66.03); line (327.08, 68.17); line (322.92, 68.17); line (320.84, 66.03); line (322.92, 63.88);
  line (327.08, 63.88); close; move (322.16, 69.53); line (320.08, 71.67); line (315.92, 71.67); line (313.84, 69.53); line (315.92, 67.38); line (320.08, 67.38); close; move (315.16, 73.03); line (313.08, 75.17); line (308.92, 75.17);
  line (306.84, 73.03); line (308.92, 70.88); line (313.08, 70.88); close; move (-104, 58); line (-34, 93); line (-34, 88); line (-104, 53); close; move (-16, 102); line (54, 137); line (54, 132);
  line (-16, 97); close; move (72, 146); line (142, 181); line (142, 176); line (72, 141); close; move (160, 190); line (230, 225); line (230, 220); line (160, 185); close;
  move (248, 234); line (318, 269); line (318, 264); line (248, 229); close; move (336, 278); line (406, 313); line (406, 308); line (336, 273); close; move (424, 322); line (494, 357);
  line (494, 352); line (424, 317); close; move (512, 366); line (582, 401); line (582, 396); line (512, 361); close; move (600, 410); line (670, 445); line (670, 440); line (600, 405);
  close; move (688, 454); line (758, 489); line (758, 484); line (688, 449); close; move (1180.16, 484.52); line (1178.08, 486.67); line (1173.92, 486.67); line (1171.84, 484.52); line (1173.92, 482.38); line (1178.08, 482.38);
  close; move (1173.16, 488.02); line (1171.08, 490.17); line (1166.92, 490.17); line (1164.84, 488.02); line (1166.92, 485.88); line (1171.08, 485.88); close; move (1166.16, 491.52); line (1164.08, 493.67); line (1159.92, 493.67); line (1157.84, 491.52);
  line (1159.92, 489.38); line (1164.08, 489.38); close; move (1159.16, 495.02); line (1157.08, 497.17); line (1152.92, 497.17); line (1150.84, 495.02); line (1152.92, 492.88); line (1157.08, 492.88); close; move (1216.16, 502.52); line (1214.08, 504.67);
  line (1209.92, 504.67); line (1207.84, 502.52); line (1209.92, 500.38); line (1214.08, 500.38); close; move (1209.16, 506.02); line (1207.08, 508.17); line (1202.92, 508.17); line (1200.84, 506.02); line (1202.92, 503.88); line (1207.08, 503.88); close;
  move (1202.16, 509.52); line (1200.08, 511.67); line (1195.92, 511.67); line (1193.84, 509.52); line (1195.92, 507.38); line (1200.08, 507.38); close; move (1195.16, 513.02); line (1193.08, 515.17); line (1188.92, 515.17); line (1186.84, 513.02); line (1188.92, 510.88);
  line (1193.08, 510.88); close; move (776, 498); line (846, 533); line (846, 528); line (776, 493); close; move (864, 542); line (934, 577); line (934, 572); line (864, 537); close;
  move (952, 586); line (1022, 621); line (1022, 616); line (952, 581); close; move (1040, 630); line (1110, 665); line (1110, 660); line (1040, 625); close;
};
path rpGlass { zIndex 9; opacity 0.78; fill #cfe8e2;
  move (330, 8); line (364, 25); line (336, 39); line (302, 22); close; move (302, 40); line (336, 57); line (336, 39); line (302, 22); close; move (364, 43); line (336, 57);
  line (336, 39); line (364, 25); close; move (1210, 448); line (1244, 465); line (1216, 479); line (1182, 462); close; move (1182, 480); line (1216, 497); line (1216, 479); line (1182, 462);
  close; move (1244, 483); line (1216, 497); line (1216, 479); line (1244, 465); close;
};
path rpGlassFrame { zIndex 9; fill #e8f3ef;
  move (-124, -248); line (-60, -216); line (-72, -210); line (-136, -242); close; move (-142, -239); line (-78, -207); line (-90, -201); line (-154, -233); close; move (-160, -230); line (-96, -198);
  line (-108, -192); line (-172, -224); close; move (-280, 15.5); line (-250, 30.5); line (-276, 43.5); line (-306, 28.5); close; move (-384, 77.5); line (-354, 92.5); line (-380, 105.5); line (-410, 90.5);
  close; move (330, 8); line (364, 25); line (350, 23); line (316, 6); close; move (302, 40); line (302.8, 40.4); line (302.8, 22.4); line (302, 22); close; move (310.5, 44.25);
  line (311.3, 44.65); line (311.3, 26.65); line (310.5, 26.25); close; move (319, 48.5); line (319.8, 48.9); line (319.8, 30.9); line (319, 30.5); close; move (327.5, 52.75); line (328.3, 53.15); line (328.3, 35.15);
  line (327.5, 34.75); close; move (336, 57); line (336.8, 57.4); line (336.8, 39.4); line (336, 39); close; move (364, 43); line (363.2, 43.4); line (363.2, 25.4); line (364, 25); close;
  move (357, 46.5); line (356.2, 46.9); line (356.2, 28.9); line (357, 28.5); close; move (350, 50); line (349.2, 50.4); line (349.2, 32.4); line (350, 32); close; move (343, 53.5); line (342.2, 53.9);
  line (342.2, 35.9); line (343, 35.5); close; move (336, 57); line (335.2, 57.4); line (335.2, 39.4); line (336, 39); close; move (756, 192); line (820, 224); line (808, 230); line (744, 198);
  close; move (738, 201); line (802, 233); line (790, 239); line (726, 207); close; move (720, 210); line (784, 242); line (772, 248); line (708, 216); close; move (600, 455.5);
  line (630, 470.5); line (604, 483.5); line (574, 468.5); close; move (-154, 180.5); line (-124, 195.5); line (-150, 208.5); line (-180, 193.5); close; move (46, 292.5); line (76, 307.5); line (50, 320.5);
  line (20, 305.5); close; move (246, 380.5); line (276, 395.5); line (250, 408.5); line (220, 393.5); close; move (496, 517.5); line (526, 532.5); line (500, 545.5); line (470, 530.5); close;
  move (1210, 448); line (1244, 465); line (1230, 463); line (1196, 446); close; move (1182, 480); line (1182.8, 480.4); line (1182.8, 462.4); line (1182, 462); close; move (1190.5, 484.25); line (1191.3, 484.65);
  line (1191.3, 466.65); line (1190.5, 466.25); close; move (1199, 488.5); line (1199.8, 488.9); line (1199.8, 470.9); line (1199, 470.5); close; move (1207.5, 492.75); line (1208.3, 493.15); line (1208.3, 475.15); line (1207.5, 474.75);
  close; move (1216, 497); line (1216.8, 497.4); line (1216.8, 479.4); line (1216, 479); close; move (1244, 483); line (1243.2, 483.4); line (1243.2, 465.4); line (1244, 465); close; move (1237, 486.5);
  line (1236.2, 486.9); line (1236.2, 468.9); line (1237, 468.5); close; move (1230, 490); line (1229.2, 490.4); line (1229.2, 472.4); line (1230, 472); close; move (1223, 493.5); line (1222.2, 493.9); line (1222.2, 475.9);
  line (1223, 475.5); close; move (1216, 497); line (1215.2, 497.4); line (1215.2, 479.4); line (1216, 479); close; move (726, 620.5); line (756, 635.5); line (730, 648.5); line (700, 633.5); close;
};
path rpWood { zIndex 9; fill #9b6a45;
  move (-328, -323); line (-325, -321.5); line (-361, -303.5); line (-364, -305); close; move (-318, -318); line (-315, -316.5); line (-351, -298.5); line (-354, -300); close; move (-308, -313); line (-305, -311.5);
  line (-341, -293.5); line (-344, -295); close; move (-298, -308); line (-295, -306.5); line (-331, -288.5); line (-334, -290); close; move (-337, -284.5); line (-335, -283.5); line (-337, -282.5); line (-339, -283.5);
  close; move (-339, -259.5); line (-337, -258.5); line (-337, -282.5); line (-339, -283.5); close; move (-303, -267.5); line (-301, -266.5); line (-303, -265.5); line (-305, -266.5); close; move (-305, -242.5);
  line (-303, -241.5); line (-303, -265.5); line (-305, -266.5); close; move (552, 117); line (555, 118.5); line (519, 136.5); line (516, 135); close; move (562, 122); line (565, 123.5); line (529, 141.5);
  line (526, 140); close; move (572, 127); line (575, 128.5); line (539, 146.5); line (536, 145); close; move (582, 132); line (585, 133.5); line (549, 151.5); line (546, 150); close;
  move (543, 155.5); line (545, 156.5); line (543, 157.5); line (541, 156.5); close; move (541, 180.5); line (543, 181.5); line (543, 157.5); line (541, 156.5); close; move (577, 172.5); line (579, 173.5);
  line (577, 174.5); line (575, 173.5); close; move (575, 197.5); line (577, 198.5); line (577, 174.5); line (575, 173.5); close;
};
path rpWoodDark { zIndex 9; fill #7a5032;
  move (-333, -298.5); line (-330, -297); line (-330, -319); line (-333, -320.5); close; move (-303, -283.5); line (-300, -282); line (-300, -304); line (-303, -305.5); close; move (-363, -283.5); line (-360, -282);
  line (-360, -304); line (-363, -305.5); close; move (-333, -268.5); line (-330, -267); line (-330, -289); line (-333, -290.5); close; move (-335, -259.5); line (-337, -258.5); line (-337, -282.5); line (-335, -283.5);
  close; move (-301, -242.5); line (-303, -241.5); line (-303, -265.5); line (-301, -266.5); close; move (-180, -303); line (-178, -302); line (-180, -301); line (-182, -302); close; move (-182, -290);
  line (-180, -289); line (-180, -301); line (-182, -302); close; move (-178, -290); line (-180, -289); line (-180, -301); line (-178, -302); close; move (-150, -258); line (-148, -257); line (-150, -256);
  line (-152, -257); close; move (-152, -245); line (-150, -244); line (-150, -256); line (-152, -257); close; move (-148, -245); line (-150, -244); line (-150, -256); line (-148, -257); close;
  move (-55, -245.5); line (-53, -244.5); line (-55, -243.5); line (-57, -244.5); close; move (-57, -232.5); line (-55, -231.5); line (-55, -243.5); line (-57, -244.5); close; move (-53, -232.5); line (-55, -231.5);
  line (-55, -243.5); line (-53, -244.5); close; move (-60, -203); line (-58, -202); line (-60, -201); line (-62, -202); close; move (-62, -190); line (-60, -189); line (-60, -201); line (-62, -202);
  close; move (-58, -190); line (-60, -189); line (-60, -201); line (-58, -202); close; move (547, 141.5); line (550, 143); line (550, 121); line (547, 119.5); close; move (577, 156.5);
  line (580, 158); line (580, 136); line (577, 134.5); close; move (517, 156.5); line (520, 158); line (520, 136); line (517, 134.5); close; move (547, 171.5); line (550, 173); line (550, 151);
  line (547, 149.5); close; move (545, 180.5); line (543, 181.5); line (543, 157.5); line (545, 156.5); close; move (579, 197.5); line (577, 198.5); line (577, 174.5); line (579, 173.5); close;
  move (700, 137); line (702, 138); line (700, 139); line (698, 138); close; move (698, 150); line (700, 151); line (700, 139); line (698, 138); close; move (702, 150); line (700, 151);
  line (700, 139); line (702, 138); close; move (730, 182); line (732, 183); line (730, 184); line (728, 183); close; move (728, 195); line (730, 196); line (730, 184); line (728, 183);
  close; move (732, 195); line (730, 196); line (730, 184); line (732, 183); close; move (825, 194.5); line (827, 195.5); line (825, 196.5); line (823, 195.5); close; move (823, 207.5);
  line (825, 208.5); line (825, 196.5); line (823, 195.5); close; move (827, 207.5); line (825, 208.5); line (825, 196.5); line (827, 195.5); close; move (820, 237); line (822, 238); line (820, 239);
  line (818, 238); close; move (818, 250); line (820, 251); line (820, 239); line (818, 238); close; move (822, 250); line (820, 251); line (820, 239); line (822, 238); close;
};
path rpLine { zIndex 9; fill #5a524b;
  move (-337, -282.5); line (-303, -265.5); line (-303, -264.9); line (-337, -281.9); close; move (543, 157.5); line (577, 174.5); line (577, 175.1); line (543, 158.1); close;
};
path rpTank { zIndex 9; fill #9fa7a3;
  move (-136, -239); line (-72, -207); line (-72, -210); line (-136, -242); close; move (-60, -213); line (-72, -207); line (-72, -210); line (-60, -216); close; move (-154, -230); line (-90, -198);
  line (-90, -201); line (-154, -233); close; move (-78, -204); line (-90, -198); line (-90, -201); line (-78, -207); close; move (-172, -221); line (-108, -189); line (-108, -192); line (-172, -224);
  close; move (-96, -195); line (-108, -189); line (-108, -192); line (-96, -198); close; move (-424, -34); line (-408, -26); line (-408, -34); line (-424, -42); close; move (-392, -34);
  line (-408, -26); line (-408, -34); line (-392, -42); close; move (394, 64); line (410, 72); line (410, 58); line (394, 50); close; move (426, 64); line (410, 72); line (410, 58);
  line (426, 50); close; move (388, 95); line (398, 100); line (398, 94); line (388, 89); close; move (408, 95); line (398, 100); line (398, 94); line (408, 89); close;
  move (744, 201); line (808, 233); line (808, 230); line (744, 198); close; move (820, 227); line (808, 233); line (808, 230); line (820, 224); close; move (726, 210); line (790, 242);
  line (790, 239); line (726, 207); close; move (802, 236); line (790, 242); line (790, 239); line (802, 233); close; move (708, 219); line (772, 251); line (772, 248); line (708, 216);
  close; move (784, 245); line (772, 251); line (772, 248); line (784, 242); close; move (-174, 91); line (-158, 99); line (-158, 91); line (-174, 83); close; move (-142, 91);
  line (-158, 99); line (-158, 91); line (-142, 83); close; move (-34, 147); line (-18, 155); line (-18, 147); line (-34, 139); close; move (-2, 147); line (-18, 155); line (-18, 147);
  line (-2, 139); close; move (116, 236); line (132, 244); line (132, 236); line (116, 228); close; move (148, 236); line (132, 244); line (132, 236); line (148, 228); close;
  move (286, 307); line (302, 315); line (302, 307); line (286, 299); close; move (318, 307); line (302, 315); line (302, 307); line (318, 299); close; move (456, 406); line (472, 414);
  line (472, 406); line (456, 398); close; move (488, 406); line (472, 414); line (472, 406); line (488, 398); close; move (-298, 131); line (-282, 139); line (-282, 131); line (-298, 123);
  close; move (-266, 131); line (-282, 139); line (-282, 131); line (-266, 123); close; move (-78, 253); line (-62, 261); line (-62, 253); line (-78, 245); close; move (-46, 253);
  line (-62, 261); line (-62, 253); line (-46, 245); close; move (122, 341); line (138, 349); line (138, 341); line (122, 333); close; move (154, 341); line (138, 349); line (138, 341);
  line (154, 333); close; move (322, 453); line (338, 461); line (338, 453); line (322, 445); close; move (354, 453); line (338, 461); line (338, 453); line (354, 445); close;
  move (1274, 504); line (1290, 512); line (1290, 498); line (1274, 490); close; move (1306, 504); line (1290, 512); line (1290, 498); line (1306, 490); close; move (1268, 535); line (1278, 540);
  line (1278, 534); line (1268, 529); close; move (1288, 535); line (1278, 540); line (1278, 534); line (1288, 529); close; move (706, 531); line (722, 539); line (722, 531); line (706, 523);
  close; move (738, 531); line (722, 539); line (722, 531); line (738, 523); close; move (846, 587); line (862, 595); line (862, 587); line (846, 579); close; move (878, 587);
  line (862, 595); line (862, 587); line (878, 579); close; move (582, 571); line (598, 579); line (598, 571); line (582, 563); close; move (614, 571); line (598, 579); line (598, 571);
  line (614, 563); close;
};
path rpTankTop { zIndex 9; fill #c5cbc6;
  move (-408, -50); line (-392, -42); line (-408, -34); line (-424, -42); close; move (410, 42); line (426, 50); line (410, 58); line (394, 50); close; move (398, 84); line (408, 89);
  line (398, 94); line (388, 89); close; move (-158, 75); line (-142, 83); line (-158, 91); line (-174, 83); close; move (-18, 131); line (-2, 139); line (-18, 147); line (-34, 139);
  close; move (132, 220); line (148, 228); line (132, 236); line (116, 228); close; move (302, 291); line (318, 299); line (302, 307); line (286, 299); close; move (472, 390);
  line (488, 398); line (472, 406); line (456, 398); close; move (-282, 115); line (-266, 123); line (-282, 131); line (-298, 123); close; move (-62, 237); line (-46, 245); line (-62, 253);
  line (-78, 245); close; move (138, 325); line (154, 333); line (138, 341); line (122, 333); close; move (338, 437); line (354, 445); line (338, 453); line (322, 445); close;
  move (1290, 482); line (1306, 490); line (1290, 498); line (1274, 490); close; move (1278, 524); line (1288, 529); line (1278, 534); line (1268, 529); close; move (722, 515); line (738, 523);
  line (722, 531); line (706, 523); close; move (862, 571); line (878, 579); line (862, 587); line (846, 579); close; move (598, 555); line (614, 563); line (598, 571); line (582, 563);
  close;
};
path aTeal { zIndex 12; fill #2f8a86;
  move (-317, -190.5); line (-223, -143.5); line (-236, -131); line (-330, -178); close; move (563, 249.5); line (657, 296.5); line (644, 309); line (550, 262); close;
};
path aTealDark { zIndex 12; fill #226a68;
  move (-330, -174); line (-236, -127); line (-236, -131); line (-330, -178); close; move (-223, -137.5); line (-236, -131); line (-236, -137); line (-223, -143.5); close; move (550, 266); line (644, 313);
  line (644, 309); line (550, 262); close; move (657, 302.5); line (644, 309); line (644, 303); line (657, 296.5); close;
};
path aCoral { zIndex 12; fill #ec7a62;
  move (-417, -240.5); line (-323, -193.5); line (-336, -181); line (-430, -228); close; move (-97, -80.5); line (-3, -33.5); line (-16, -21); line (-110, -68); close; move (-361.5, -57.3); line (-364.75, -54.44);
  line (-371.25, -54.44); line (-374.5, -57.3); line (-371.25, -60.16); line (-364.75, -60.16); close; move (-273.5, -13.3); line (-276.75, -10.44); line (-283.25, -10.44); line (-286.5, -13.3); line (-283.25, -16.16); line (-276.75, -16.16); close;
  move (-185.5, 30.7); line (-188.75, 33.56); line (-195.25, 33.56); line (-198.5, 30.7); line (-195.25, 27.84); line (-188.75, 27.84); close; move (163, 49.5); line (237, 86.5); line (224, 99); line (150, 62); close;
  move (463, 199.5); line (557, 246.5); line (544, 259); line (450, 212); close; move (783, 359.5); line (877, 406.5); line (864, 419); line (770, 372); close; move (-97.5, 74.7); line (-100.75, 77.56);
  line (-107.25, 77.56); line (-110.5, 74.7); line (-107.25, 71.84); line (-100.75, 71.84); close; move (-9.5, 118.7); line (-12.75, 121.56); line (-19.25, 121.56); line (-22.5, 118.7); line (-19.25, 115.84); line (-12.75, 115.84); close;
  move (78.5, 162.7); line (75.25, 165.56); line (68.75, 165.56); line (65.5, 162.7); line (68.75, 159.84); line (75.25, 159.84); close; move (166.5, 206.7); line (163.25, 209.56); line (156.75, 209.56); line (153.5, 206.7); line (156.75, 203.84);
  line (163.25, 203.84); close; move (254.5, 250.7); line (251.25, 253.56); line (244.75, 253.56); line (241.5, 250.7); line (244.75, 247.84); line (251.25, 247.84); close; move (342.5, 294.7); line (339.25, 297.56); line (332.75, 297.56);
  line (329.5, 294.7); line (332.75, 291.84); line (339.25, 291.84); close; move (430.5, 338.7); line (427.25, 341.56); line (420.75, 341.56); line (417.5, 338.7); line (420.75, 335.84); line (427.25, 335.84); close; move (518.5, 382.7);
  line (515.25, 385.56); line (508.75, 385.56); line (505.5, 382.7); line (508.75, 379.84); line (515.25, 379.84); close; move (606.5, 426.7); line (603.25, 429.56); line (596.75, 429.56); line (593.5, 426.7); line (596.75, 423.84); line (603.25, 423.84);
  close; move (694.5, 470.7); line (691.25, 473.56); line (684.75, 473.56); line (681.5, 470.7); line (684.75, 467.84); line (691.25, 467.84); close; move (1043, 489.5); line (1117, 526.5); line (1104, 539); line (1030, 502);
  close; move (782.5, 514.7); line (779.25, 517.56); line (772.75, 517.56); line (769.5, 514.7); line (772.75, 511.84); line (779.25, 511.84); close; move (870.5, 558.7); line (867.25, 561.56); line (860.75, 561.56); line (857.5, 558.7);
  line (860.75, 555.84); line (867.25, 555.84); close; move (958.5, 602.7); line (955.25, 605.56); line (948.75, 605.56); line (945.5, 602.7); line (948.75, 599.84); line (955.25, 599.84); close;
};
path aCoralDark { zIndex 12; fill #c95e49;
  move (-430, -224); line (-336, -177); line (-336, -181); line (-430, -228); close; move (-323, -187.5); line (-336, -181); line (-336, -187); line (-323, -193.5); close; move (-110, -64); line (-16, -17);
  line (-16, -21); line (-110, -68); close; move (-3, -27.5); line (-16, -21); line (-16, -27); line (-3, -33.5); close; move (150, 66); line (224, 103); line (224, 99); line (150, 62);
  close; move (237, 92.5); line (224, 99); line (224, 93); line (237, 86.5); close; move (450, 216); line (544, 263); line (544, 259); line (450, 212); close; move (557, 252.5);
  line (544, 259); line (544, 253); line (557, 246.5); close; move (770, 376); line (864, 423); line (864, 419); line (770, 372); close; move (877, 412.5); line (864, 419); line (864, 413);
  line (877, 406.5); close; move (1030, 506); line (1104, 543); line (1104, 539); line (1030, 502); close; move (1117, 532.5); line (1104, 539); line (1104, 533); line (1117, 526.5); close;
};
path aMustard { zIndex 12; fill #e2a92f;
  move (-217, -140.5); line (-103, -83.5); line (-116, -71); line (-230, -128); close; move (-331.5, -36.3); line (-334.75, -33.44); line (-341.25, -33.44); line (-344.5, -36.3); line (-341.25, -39.16); line (-334.75, -39.16); close;
  move (-243.5, 7.7); line (-246.75, 10.56); line (-253.25, 10.56); line (-256.5, 7.7); line (-253.25, 4.84); line (-246.75, 4.84); close; move (-155.5, 51.7); line (-158.75, 54.56); line (-165.25, 54.56); line (-168.5, 51.7); line (-165.25, 48.84);
  line (-158.75, 48.84); close; move (243, 89.5); line (317, 126.5); line (304, 139); line (230, 102); close; move (663, 299.5); line (777, 356.5); line (764, 369); line (650, 312); close;
  move (-67.5, 95.7); line (-70.75, 98.56); line (-77.25, 98.56); line (-80.5, 95.7); line (-77.25, 92.84); line (-70.75, 92.84); close; move (20.5, 139.7); line (17.25, 142.56); line (10.75, 142.56); line (7.5, 139.7); line (10.75, 136.84);
  line (17.25, 136.84); close; move (108.5, 183.7); line (105.25, 186.56); line (98.75, 186.56); line (95.5, 183.7); line (98.75, 180.84); line (105.25, 180.84); close; move (196.5, 227.7); line (193.25, 230.56); line (186.75, 230.56);
  line (183.5, 227.7); line (186.75, 224.84); line (193.25, 224.84); close; move (284.5, 271.7); line (281.25, 274.56); line (274.75, 274.56); line (271.5, 271.7); line (274.75, 268.84); line (281.25, 268.84); close; move (372.5, 315.7);
  line (369.25, 318.56); line (362.75, 318.56); line (359.5, 315.7); line (362.75, 312.84); line (369.25, 312.84); close; move (460.5, 359.7); line (457.25, 362.56); line (450.75, 362.56); line (447.5, 359.7); line (450.75, 356.84); line (457.25, 356.84);
  close; move (548.5, 403.7); line (545.25, 406.56); line (538.75, 406.56); line (535.5, 403.7); line (538.75, 400.84); line (545.25, 400.84); close; move (636.5, 447.7); line (633.25, 450.56); line (626.75, 450.56); line (623.5, 447.7);
  line (626.75, 444.84); line (633.25, 444.84); close; move (724.5, 491.7); line (721.25, 494.56); line (714.75, 494.56); line (711.5, 491.7); line (714.75, 488.84); line (721.25, 488.84); close; move (1123, 529.5); line (1197, 566.5);
  line (1184, 579); line (1110, 542); close; move (812.5, 535.7); line (809.25, 538.56); line (802.75, 538.56); line (799.5, 535.7); line (802.75, 532.84); line (809.25, 532.84); close; move (900.5, 579.7); line (897.25, 582.56);
  line (890.75, 582.56); line (887.5, 579.7); line (890.75, 576.84); line (897.25, 576.84); close; move (988.5, 623.7); line (985.25, 626.56); line (978.75, 626.56); line (975.5, 623.7); line (978.75, 620.84); line (985.25, 620.84); close;
};
path aMustardDark { zIndex 12; fill #b98420;
  move (-230, -124); line (-116, -67); line (-116, -71); line (-230, -128); close; move (-103, -77.5); line (-116, -71); line (-116, -77); line (-103, -83.5); close; move (230, 106); line (304, 143);
  line (304, 139); line (230, 102); close; move (317, 132.5); line (304, 139); line (304, 133); line (317, 126.5); close; move (650, 316); line (764, 373); line (764, 369); line (650, 312);
  close; move (777, 362.5); line (764, 369); line (764, 363); line (777, 356.5); close; move (1110, 546); line (1184, 583); line (1184, 579); line (1110, 542); close; move (1197, 572.5);
  line (1184, 579); line (1184, 573); line (1197, 566.5); close;
};
path aStripe { zIndex 12; fill #f4ead6;
  move (-217, -140.5); line (-212, -138); line (-225, -125.5); line (-230, -128); close; move (-207, -135.5); line (-202, -133); line (-215, -120.5); line (-220, -123); close; move (-197, -130.5); line (-192, -128);
  line (-205, -115.5); line (-210, -118); close; move (-187, -125.5); line (-182, -123); line (-195, -110.5); line (-200, -113); close; move (-177, -120.5); line (-172, -118); line (-185, -105.5); line (-190, -108);
  close; move (-167, -115.5); line (-162, -113); line (-175, -100.5); line (-180, -103); close; move (-157, -110.5); line (-152, -108); line (-165, -95.5); line (-170, -98); close; move (-147, -105.5);
  line (-142, -103); line (-155, -90.5); line (-160, -93); close; move (-137, -100.5); line (-132, -98); line (-145, -85.5); line (-150, -88); close; move (-127, -95.5); line (-122, -93); line (-135, -80.5);
  line (-140, -83); close; move (-117, -90.5); line (-112, -88); line (-125, -75.5); line (-130, -78); close; move (163, 49.5); line (168, 52); line (155, 64.5); line (150, 62); close;
  move (173, 54.5); line (178, 57); line (165, 69.5); line (160, 67); close; move (183, 59.5); line (188, 62); line (175, 74.5); line (170, 72); close; move (193, 64.5); line (198, 67);
  line (185, 79.5); line (180, 77); close; move (203, 69.5); line (208, 72); line (195, 84.5); line (190, 82); close; move (213, 74.5); line (218, 77); line (205, 89.5); line (200, 87);
  close; move (223, 79.5); line (228, 82); line (215, 94.5); line (210, 92); close; move (663, 299.5); line (668, 302); line (655, 314.5); line (650, 312); close; move (673, 304.5);
  line (678, 307); line (665, 319.5); line (660, 317); close; move (683, 309.5); line (688, 312); line (675, 324.5); line (670, 322); close; move (693, 314.5); line (698, 317); line (685, 329.5);
  line (680, 327); close; move (703, 319.5); line (708, 322); line (695, 334.5); line (690, 332); close; move (713, 324.5); line (718, 327); line (705, 339.5); line (700, 337); close;
  move (723, 329.5); line (728, 332); line (715, 344.5); line (710, 342); close; move (733, 334.5); line (738, 337); line (725, 349.5); line (720, 347); close; move (743, 339.5); line (748, 342);
  line (735, 354.5); line (730, 352); close; move (753, 344.5); line (758, 347); line (745, 359.5); line (740, 357); close; move (763, 349.5); line (768, 352); line (755, 364.5); line (750, 362);
  close; move (1043, 489.5); line (1048, 492); line (1035, 504.5); line (1030, 502); close; move (1053, 494.5); line (1058, 497); line (1045, 509.5); line (1040, 507); close; move (1063, 499.5);
  line (1068, 502); line (1055, 514.5); line (1050, 512); close; move (1073, 504.5); line (1078, 507); line (1065, 519.5); line (1060, 517); close; move (1083, 509.5); line (1088, 512); line (1075, 524.5);
  line (1070, 522); close; move (1093, 514.5); line (1098, 517); line (1085, 529.5); line (1080, 527); close; move (1103, 519.5); line (1108, 522); line (1095, 534.5); line (1090, 532); close;
};
path aBlade { zIndex 12; fill #3b3431;
  move (-312, -189); line (-314, -188); line (-314, -201); line (-312, -202); close; move (-314, -199); line (-326, -193); line (-326, -194); line (-314, -200); close; move (-212, -139); line (-214, -138);
  line (-214, -151); line (-212, -152); close; move (-214, -149); line (-226, -143); line (-226, -144); line (-214, -150); close; move (168, 51); line (166, 52); line (166, 39); line (168, 38);
  close; move (166, 41); line (154, 47); line (154, 46); line (166, 40); close; move (248, 91); line (246, 92); line (246, 79); line (248, 78); close; move (246, 81);
  line (234, 87); line (234, 86); line (246, 80); close; move (328, 131); line (326, 132); line (326, 119); line (328, 118); close; move (326, 121); line (314, 127); line (314, 126);
  line (326, 120); close; move (468, 201); line (466, 202); line (466, 189); line (468, 188); close; move (466, 191); line (454, 197); line (454, 196); line (466, 190); close;
  move (568, 251); line (566, 252); line (566, 239); line (568, 238); close; move (566, 241); line (554, 247); line (554, 246); line (566, 240); close; move (668, 301); line (666, 302);
  line (666, 289); line (668, 288); close; move (666, 291); line (654, 297); line (654, 296); line (666, 290); close; move (1048, 491); line (1046, 492); line (1046, 479); line (1048, 478);
  close; move (1046, 481); line (1034, 487); line (1034, 486); line (1046, 480); close; move (1128, 531); line (1126, 532); line (1126, 519); line (1128, 518); close; move (1126, 521);
  line (1114, 527); line (1114, 526); line (1126, 520); close; move (1208, 571); line (1206, 572); line (1206, 559); line (1208, 558); close; move (1206, 561); line (1194, 567); line (1194, 566);
  line (1206, 560); close;
};
path aLamp { zIndex 12; fill #3b3431;
  move (-332, -154); line (-330.4, -153.2); line (-330.4, -195.2); line (-332, -196); close; move (-336.6, -195.7); line (-331, -192.9); line (-331, -196.9); line (-336.6, -199.7); close; move (-325.4, -195.7); line (-331, -192.9);
  line (-331, -196.9); line (-325.4, -199.7); close; move (-132, -54); line (-130.4, -53.2); line (-130.4, -95.2); line (-132, -96); close; move (-136.6, -95.7); line (-131, -92.9); line (-131, -96.9); line (-136.6, -99.7);
  close; move (-125.4, -95.7); line (-131, -92.9); line (-131, -96.9); line (-125.4, -99.7); close; move (138, 81); line (139.6, 81.8); line (139.6, 39.8); line (138, 39); close; move (133.4, 39.3);
  line (139, 42.1); line (139, 38.1); line (133.4, 35.3); close; move (144.6, 39.3); line (139, 42.1); line (139, 38.1); line (144.6, 35.3); close; move (318, 171); line (319.6, 171.8); line (319.6, 129.8);
  line (318, 129); close; move (313.4, 129.3); line (319, 132.1); line (319, 128.1); line (313.4, 125.3); close; move (324.6, 129.3); line (319, 132.1); line (319, 128.1); line (324.6, 125.3); close;
  move (548, 286); line (549.6, 286.8); line (549.6, 244.8); line (548, 244); close; move (543.4, 244.3); line (549, 247.1); line (549, 243.1); line (543.4, 240.3); close; move (554.6, 244.3); line (549, 247.1);
  line (549, 243.1); line (554.6, 240.3); close; move (748, 386); line (749.6, 386.8); line (749.6, 344.8); line (748, 344); close; move (743.4, 344.3); line (749, 347.1); line (749, 343.1); line (743.4, 340.3);
  close; move (754.6, 344.3); line (749, 347.1); line (749, 343.1); line (754.6, 340.3); close; move (1018, 521); line (1019.6, 521.8); line (1019.6, 479.8); line (1018, 479); close; move (1013.4, 479.3);
  line (1019, 482.1); line (1019, 478.1); line (1013.4, 475.3); close; move (1024.6, 479.3); line (1019, 482.1); line (1019, 478.1); line (1024.6, 475.3); close; move (1198, 611); line (1199.6, 611.8); line (1199.6, 569.8);
  line (1198, 569); close; move (1193.4, 569.3); line (1199, 572.1); line (1199, 568.1); line (1193.4, 565.3); close; move (1204.6, 569.3); line (1199, 572.1); line (1199, 568.1); line (1204.6, 565.3); close;
};
path aLampGlow { zIndex 12; fill #fbe4a6;
  move (-331, -202.5); line (-325.4, -199.7); line (-331, -196.9); line (-336.6, -199.7); close; move (-131, -102.5); line (-125.4, -99.7); line (-131, -96.9); line (-136.6, -99.7); close; move (139, 32.5); line (144.6, 35.3);
  line (139, 38.1); line (133.4, 35.3); close; move (319, 122.5); line (324.6, 125.3); line (319, 128.1); line (313.4, 125.3); close; move (549, 237.5); line (554.6, 240.3); line (549, 243.1); line (543.4, 240.3);
  close; move (749, 337.5); line (754.6, 340.3); line (749, 343.1); line (743.4, 340.3); close; move (1019, 472.5); line (1024.6, 475.3); line (1019, 478.1); line (1013.4, 475.3); close; move (1199, 562.5);
  line (1204.6, 565.3); line (1199, 568.1); line (1193.4, 565.3); close;
};
path cafem1Front { zIndex 8; fill #c8694b; move (-820, -410); line (-720, -360); line (-720, -420); line (-820, -470); close; };
path cafe0Front { zIndex 8; fill #c8694b; move (60, 30); line (160, 80); line (160, 20); line (60, -30); close; };
path cafe1Front { zIndex 8; fill #c8694b; move (940, 470); line (1040, 520); line (1040, 460); line (940, 410); close; };
group train {
  zIndex 3;
  path car0 { fill #f4ead6; move (-64, -34); line (0, -2); line (0, -22); line (-64, -54); close; move (14, -9); line (0, -2); line (0, -22); line (14, -29); close; };
  path car1 { fill #f4ead6; move (-134, -69); line (-70, -37); line (-70, -57); line (-134, -89); close;  };
  path car2 { fill #f4ead6; move (-204, -104); line (-140, -72); line (-140, -92); line (-204, -124); close;  };
  path car3 { fill #f4ead6; move (-274, -139); line (-210, -107); line (-210, -127); line (-274, -159); close;  };
  path roof { fill #2f8a86; move (-50, -61); line (14, -29); line (0, -22); line (-64, -54); close; move (-120, -96); line (-56, -64); line (-70, -57); line (-134, -89); close; move (-190, -131); line (-126, -99); line (-140, -92); line (-204, -124); close; move (-260, -166); line (-196, -134); line (-210, -127); line (-274, -159); close; };
  path skirt { fill #226a68; move (-64, -34); line (0, -2); line (0, -6); line (-64, -38); close; move (-134, -69); line (-70, -37); line (-70, -41); line (-134, -73); close; move (-59, -46.5); line (-53, -43.5); line (-61, -39.5); line (-67, -42.5); close; move (-204, -104); line (-140, -72); line (-140, -76); line (-204, -108); close; move (-129, -81.5); line (-123, -78.5); line (-131, -74.5); line (-137, -77.5); close; move (-274, -139); line (-210, -107); line (-210, -111); line (-274, -143); close; move (-199, -116.5); line (-193, -113.5); line (-201, -109.5); line (-207, -112.5); close; };
  path windows { fill #36505a; move (-59, -39.5); line (-52, -36); line (-52, -43); line (-59, -46.5); close; move (-49, -34.5); line (-42, -31); line (-42, -38); line (-49, -41.5); close; move (-39, -29.5); line (-32, -26); line (-32, -33); line (-39, -36.5); close; move (-29, -24.5); line (-22, -21); line (-22, -28); line (-29, -31.5); close; move (-19, -19.5); line (-12, -16); line (-12, -23); line (-19, -26.5); close; move (-129, -74.5); line (-122, -71); line (-122, -78); line (-129, -81.5); close; move (-119, -69.5); line (-112, -66); line (-112, -73); line (-119, -76.5); close; move (-109, -64.5); line (-102, -61); line (-102, -68); line (-109, -71.5); close; move (-99, -59.5); line (-92, -56); line (-92, -63); line (-99, -66.5); close; move (-89, -54.5); line (-82, -51); line (-82, -58); line (-89, -61.5); close; move (-199, -109.5); line (-192, -106); line (-192, -113); line (-199, -116.5); close; move (-189, -104.5); line (-182, -101); line (-182, -108); line (-189, -111.5); close; move (-179, -99.5); line (-172, -96); line (-172, -103); line (-179, -106.5); close; move (-169, -94.5); line (-162, -91); line (-162, -98); line (-169, -101.5); close; move (-159, -89.5); line (-152, -86); line (-152, -93); line (-159, -96.5); close; move (-269, -144.5); line (-262, -141); line (-262, -148); line (-269, -151.5); close; move (-259, -139.5); line (-252, -136); line (-252, -143); line (-259, -146.5); close; move (-249, -134.5); line (-242, -131); line (-242, -138); line (-249, -141.5); close; move (-239, -129.5); line (-232, -126); line (-232, -133); line (-239, -136.5); close; move (-229, -124.5); line (-222, -121); line (-222, -128); line (-229, -131.5); close; };
};
animate train.position.x {
  expression "-3124.992 + 29.33333 * t + ((t * 153.10171 + 765.5085) % 4593.0512)";
  start 0s;
  duration 30s;
};
animate train.position.y {
  expression "-1860.496 + 14.66667 * t + 0.5 * ((t * 153.10171 + 765.5085) % 4593.0512)";
  start 0s;
  duration 30s;
};
group cafem1Awning {
  zIndex 12;
  path canopy { fill #2f8a86; move (-817, -440.5); line (-723, -393.5); line (-736, -381); line (-830, -428); close; };
  path valance { fill #226a68; move (-830, -424); line (-736, -377); line (-736, -381); line (-830, -428); close; move (-723, -387.5); line (-736, -381); line (-736, -387); line (-723, -393.5); close; };
  path scallop { fill #f4ead6; move (-828, -423); line (-824, -421); line (-824, -422.5); line (-828, -424.5); close; move (-820, -419); line (-816, -417); line (-816, -418.5); line (-820, -420.5); close; move (-812, -415); line (-808, -413); line (-808, -414.5); line (-812, -416.5); close; move (-804, -411); line (-800, -409); line (-800, -410.5); line (-804, -412.5); close; move (-796, -407); line (-792, -405); line (-792, -406.5); line (-796, -408.5); close; move (-788, -403); line (-784, -401); line (-784, -402.5); line (-788, -404.5); close; move (-780, -399); line (-776, -397); line (-776, -398.5); line (-780, -400.5); close; move (-772, -395); line (-768, -393); line (-768, -394.5); line (-772, -396.5); close; move (-764, -391); line (-760, -389); line (-760, -390.5); line (-764, -392.5); close; move (-756, -387); line (-752, -385); line (-752, -386.5); line (-756, -388.5); close; move (-748, -383); line (-744, -381); line (-744, -382.5); line (-748, -384.5); close; };
};
group cafem1Sign {
  position (-808.5, -455.75);
  rotation 52.0181deg;
  scale (1.28078, 0.78078);
  zIndex 12;
  group face {
    rotation -37.9819deg;
    rectangle board { position (0, 0); size (44, 13); cornerRadius 2; fill #2a3b3c; stroke #f4ead6 width 0.8; };
    rectangle glow { position (-1.5, -1.5); size (47, 16); cornerRadius 3; stroke #ec7a62 width 2; opacity 0; };
    text dim { position (22, 7); content "CAFÉ"; fontFamily "sans"; fontSize 10; fontWeight 800; align center; baseline middle; fill #7b8c88; };
    text lit { position (22, 7); content "CAFÉ"; fontFamily "sans"; fontSize 10; fontWeight 800; align center; baseline middle; fill #ffe7a8; };
  };
};
path bladem1b { zIndex 12; fill #ec7a62; opacity 0; move (-715, -388.5); line (-725, -383.5); line (-725, -392.5); line (-715, -397.5); close; };
path bladem1c { zIndex 12; fill #e2a92f; opacity 0; move (-635, -348.5); line (-645, -343.5); line (-645, -352.5); line (-635, -357.5); close; };
path bladem1d { zIndex 12; fill #2f8a86; opacity 0; move (-555, -308.5); line (-565, -303.5); line (-565, -312.5); line (-555, -317.5); close; };
path bladem1e { zIndex 12; fill #ec7a62; opacity 0; move (-415, -238.5); line (-425, -233.5); line (-425, -242.5); line (-415, -247.5); close; };
path bladem1f { zIndex 12; fill #2f8a86; opacity 0; move (-315, -188.5); line (-325, -183.5); line (-325, -192.5); line (-315, -197.5); close; };
path bladem1g { zIndex 12; fill #e2a92f; opacity 0; move (-215, -138.5); line (-225, -133.5); line (-225, -142.5); line (-215, -147.5); close; };
group carm1a {
  zIndex 7;
  path shadow { fill #3a2a1a40; move (-9, -13.5); line (27, 4.5); line (8, 14); line (-28, -4); close; };
  path wheels { fill #2b2522; move (-19.5, -2.75); line (-12.5, 0.75); line (-12.5, -4.25); line (-19.5, -7.75); close; move (-1.5, 6.25); line (5.5, 9.75); line (5.5, 4.75); line (-1.5, 1.25); close; move (11, 9.5); line (8, 11); line (8, 7); line (11, 5.5); close; };
  path shade { fill #b98420; move (22, 1); line (8, 8); line (8, 0); line (22, -7); close; move (13, -10.5); line (1, -4.5); line (1, -11.5); line (13, -17.5); close; };
  path body { fill #e2a92f; move (-22, -7); line (8, 8); line (8, 0); line (-22, -15); close; move (-14, -12); line (1, -4.5); line (1, -11.5); line (-14, -19); close; };
  path roof { fill #f0c35a; move (-8, -22); line (22, -7); line (8, 0); line (-22, -15); close; move (-2, -25); line (13, -17.5); line (1, -11.5); line (-14, -19); close; };
  path glass { fill #36505a; move (-12, -12); line (-1, -6.5); line (-1, -11.5); line (-12, -17); close; move (12, -11); line (2, -6); line (2, -11); line (12, -16); close; move (21, -1.5); line (18, 0); line (18, -3); line (21, -4.5); close; move (12, 3); line (9, 4.5); line (9, 1.5); line (12, 0); close; };
};
group carm1b {
  zIndex 7;
  path shadow { fill #3a2a1a40; move (-9, -13.5); line (27, 4.5); line (8, 14); line (-28, -4); close; };
  path wheels { fill #2b2522; move (-19.5, -2.75); line (-12.5, 0.75); line (-12.5, -4.25); line (-19.5, -7.75); close; move (-1.5, 6.25); line (5.5, 9.75); line (5.5, 4.75); line (-1.5, 1.25); close; move (11, 9.5); line (8, 11); line (8, 7); line (11, 5.5); close; };
  path shade { fill #c95e49; move (22, 1); line (8, 8); line (8, 0); line (22, -7); close; move (13, -10.5); line (1, -4.5); line (1, -11.5); line (13, -17.5); close; };
  path body { fill #ec7a62; move (-22, -7); line (8, 8); line (8, 0); line (-22, -15); close; move (-14, -12); line (1, -4.5); line (1, -11.5); line (-14, -19); close; };
  path roof { fill #f4a08b; move (-8, -22); line (22, -7); line (8, 0); line (-22, -15); close; move (-2, -25); line (13, -17.5); line (1, -11.5); line (-14, -19); close; };
  path glass { fill #36505a; move (-12, -12); line (-1, -6.5); line (-1, -11.5); line (-12, -17); close; move (12, -11); line (2, -6); line (2, -11); line (12, -16); close; move (21, -1.5); line (18, 0); line (18, -3); line (21, -4.5); close; move (12, 3); line (9, 4.5); line (9, 1.5); line (12, 0); close; };
};
group vanm1Back {
  zIndex 7;
  visible true;
  path shadow { fill #3a2a1a40; move (-25, -21.5); line (32, 7); line (13, 16.5); line (-44, -12); close; };
  group cabBack {
    opacity 0;
    path wheels { fill #2b2522; move (-36.5, -11.25); line (-29.5, -7.75); line (-29.5, -12.75); line (-36.5, -16.25); close; move (-20.5, -3.25); line (-13.5, 0.25); line (-13.5, -4.75); line (-20.5, -8.25); close; move (-8.5, 2.75); line (-1.5, 6.25); line (-1.5, 1.25); line (-8.5, -2.25); close; };
    path side { fill #b98420; move (-13, -16.5); line (-27, -9.5); line (-27, -23.5); line (-13, -30.5); close; };
    path body { fill #e2a92f; move (-39, -15.5); line (-27, -9.5); line (-27, -23.5); line (-39, -29.5); close; };
    path roof { fill #f0c35a; move (-25, -36.5); line (-13, -30.5); line (-27, -23.5); line (-39, -29.5); close; };
    path glass { fill #36505a; move (-37, -21.5); line (-29, -17.5); line (-29, -23.5); line (-37, -27.5); close; };
  };
  group cabFront {
    path wheels { fill #2b2522; move (-24.5, -5.25); line (-17.5, -1.75); line (-17.5, -6.75); line (-24.5, -10.25); close; move (-8.5, 2.75); line (-1.5, 6.25); line (-1.5, 1.25); line (-8.5, -2.25); close; move (3.5, 8.75); line (10.5, 12.25); line (10.5, 7.25); line (3.5, 3.75); close; };
  };
  path cargoSide { fill #b98420; move (15, -2.5); line (1, 4.5); line (1, -16.5); line (15, -23.5); close; };
  path cargo { fill #e2a92f; move (-27, -9.5); line (1, 4.5); line (1, -16.5); line (-27, -30.5); close; };
  path cargoTop { fill #f0c35a; move (-13, -37.5); line (15, -23.5); line (1, -16.5); line (-27, -30.5); close; };
  path stripe { fill #ec7a62; move (-26, -18); line (0, -5); line (0, -8); line (-26, -21); close; };
  group cab {
    path side { fill #b98420; move (27, 3.5); line (13, 10.5); line (13, -3.5); line (27, -10.5); close; };
    path body { fill #e2a92f; move (1, 4.5); line (13, 10.5); line (13, -3.5); line (1, -9.5); close; };
    path roof { fill #f0c35a; move (15, -16.5); line (27, -10.5); line (13, -3.5); line (1, -9.5); close; };
    path glass { fill #36505a; move (25, -2.5); line (15, 2.5); line (15, -3.5); line (25, -8.5); close; move (3, -1.5); line (11, 2.5); line (11, -3.5); line (3, -7.5); close; };
  };
};
group vanm1 {
  zIndex 13;
  visible false;
  path shadow { fill #3a2a1a40; move (-25, -21.5); line (32, 7); line (13, 16.5); line (-44, -12); close; };
  group cabBack {
    opacity 0;
    path wheels { fill #2b2522; move (-36.5, -11.25); line (-29.5, -7.75); line (-29.5, -12.75); line (-36.5, -16.25); close; move (-20.5, -3.25); line (-13.5, 0.25); line (-13.5, -4.75); line (-20.5, -8.25); close; move (-8.5, 2.75); line (-1.5, 6.25); line (-1.5, 1.25); line (-8.5, -2.25); close; };
    path side { fill #b98420; move (-13, -16.5); line (-27, -9.5); line (-27, -23.5); line (-13, -30.5); close; };
    path body { fill #e2a92f; move (-39, -15.5); line (-27, -9.5); line (-27, -23.5); line (-39, -29.5); close; };
    path roof { fill #f0c35a; move (-25, -36.5); line (-13, -30.5); line (-27, -23.5); line (-39, -29.5); close; };
    path glass { fill #36505a; move (-37, -21.5); line (-29, -17.5); line (-29, -23.5); line (-37, -27.5); close; };
  };
  group cabFront {
    path wheels { fill #2b2522; move (-24.5, -5.25); line (-17.5, -1.75); line (-17.5, -6.75); line (-24.5, -10.25); close; move (-8.5, 2.75); line (-1.5, 6.25); line (-1.5, 1.25); line (-8.5, -2.25); close; move (3.5, 8.75); line (10.5, 12.25); line (10.5, 7.25); line (3.5, 3.75); close; };
  };
  path cargoSide { fill #b98420; move (15, -2.5); line (1, 4.5); line (1, -16.5); line (15, -23.5); close; };
  path cargo { fill #e2a92f; move (-27, -9.5); line (1, 4.5); line (1, -16.5); line (-27, -30.5); close; };
  path cargoTop { fill #f0c35a; move (-13, -37.5); line (15, -23.5); line (1, -16.5); line (-27, -30.5); close; };
  path stripe { fill #ec7a62; move (-26, -18); line (0, -5); line (0, -8); line (-26, -21); close; };
  group cab {
    path side { fill #b98420; move (27, 3.5); line (13, 10.5); line (13, -3.5); line (27, -10.5); close; };
    path body { fill #e2a92f; move (1, 4.5); line (13, 10.5); line (13, -3.5); line (1, -9.5); close; };
    path roof { fill #f0c35a; move (15, -16.5); line (27, -10.5); line (13, -3.5); line (1, -9.5); close; };
    path glass { fill #36505a; move (25, -2.5); line (15, 2.5); line (15, -3.5); line (25, -8.5); close; move (3, -1.5); line (11, 2.5); line (11, -3.5); line (3, -7.5); close; };
  };
};
group pedAm1 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #ec7a62; };
  circle head { position (0, -26.4); radius 3.3; fill #e7b48f; };
};
group pedBm1 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #2f8a86; };
  circle head { position (0, -26.4); radius 3.3; fill #c98f6a; };
};
group pedCm1 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #5a6d8a; };
  circle head { position (0, -26.4); radius 3.3; fill #d6a07c; };
};
group pedDm1 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #e2a92f; };
  circle head { position (0, -26.4); radius 3.3; fill #e7b48f; };
};
group pedEm1 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #8a5a8a; };
  circle head { position (0, -26.4); radius 3.3; fill #e7b48f; };
};
group pedFm1 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #c95e49; };
  circle head { position (0, -26.4); radius 3.3; fill #c98f6a; };
};
group bikem1 {
  zIndex 10;
  ellipse shadow { position (0, 0); size (26, 8); fill #3a2a1a40; };
  path wheels { stroke #2b2522 width 1.3; move (-3, -7.5); line (-3.59, -10.4); line (-5.26, -13.32); line (-7.66, -15.68); line (-10.34, -17.02); line (-12.74, -17.06); line (-14.41, -15.81); line (-15, -13.5); line (-14.41, -10.6); line (-12.74, -7.68); line (-10.34, -5.32); line (-7.66, -3.98); line (-5.26, -3.94); line (-3.59, -5.19); close; move (15, 1.5); line (14.41, -1.4); line (12.74, -4.32); line (10.34, -6.68); line (7.66, -8.02); line (5.26, -8.06); line (3.59, -6.81); line (3, -4.5); line (3.59, -1.6); line (5.26, 1.32); line (7.66, 3.68); line (10.34, 5.02); line (12.74, 5.06); line (14.41, 3.81); close; };
  path frame { stroke #226a68 width 1.6 cap round join round; move (-9, -10.5); line (-1, -7.5); line (4, -13); line (-4, -17); line (-9, -10.5); move (9, -1.5); line (5, -14.5); };
  group rider {
    position (-3, -17.5);
    path legs { pivot (0, 0); fill #2b2522; move (-1, 0); line (1.2, 0); line (5, 8); line (3, 8.6); close; move (-1, 0); line (1, 0); line (-1.5, 8.4); line (-3.2, 7.6); close; };
    rectangle coat { position (-3, -13); size (6.4, 13); cornerRadius 2; fill #ec7a62; rotation 14deg; };
    circle head { position (3.6, -16); radius 3.2; fill #e7b48f; };
  };
};
group gardenAm1 {
  position (-748, -469);
  zIndex 9;
  ellipse shadow { size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.8, -23); size (7.6, 12.5); cornerRadius 2.4; fill #2f8a86; };
  circle head { position (0, -26.4); radius 3.3; fill #e7b48f; };
  path hat { fill #e2a92f; move (-5, -28); line (5, -28); line (2.5, -31); line (-2.5, -31); close; };
  group arm {
    position (2.5, -19);
    path can { fill #ec7a62; stroke #c95e49 width 0.6; move (0, 0); line (7, 2); line (7, 4); line (9, 4); line (9, 10); line (3, 10); line (3, 4); line (5, 4); line (5, 2.6); line (0, 1.2); close; move (9, 5); line (15, 2); line (15.6, 3); line (9, 7); close; };
    path water { opacity 0; stroke #8fd0e6 width 0.9 cap round; move (15.6, 3.4); line (16.4, 7); move (17.2, 4.2); line (18.4, 8.4); move (16.2, 9); line (16.8, 12); move (18.6, 10); line (19.4, 13.4); };
  };
};
group gardenBm1 {
  zIndex 9;
  ellipse shadow { size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.8, -23); size (7.6, 12.5); cornerRadius 2.4; fill #e2a92f; };
  circle head { position (0, -26.4); radius 3.3; fill #c98f6a; };
  path pot { fill #a8714d; move (-5, -18); line (5, -18); line (4, -11); line (-4, -11); close; };
  ellipse plant { position (0, -21); size (11, 7); fill #6f9b4f; };
};
group laundrym1 {
  position (-338, -282.4);
  zIndex 9;
  path c0 { fill #f4ead6; move (4, 2); line (10, 5); line (10, 14.4); line (4, 10.4); close; };
  path c1 { fill #ec7a62; move (12, 6); line (18, 9); line (18, 16.4); line (12, 14.4); close; };
  path c2 { fill #6fb1aa; move (20, 10); line (26, 13); line (26, 22.4); line (20, 18.4); close; };
  path c3 { fill #f0c35a; move (27, 13.5); line (33, 16.5); line (33, 23.9); line (27, 21.9); close; };
};
path shrubsm1 { position (21, -124.5); zIndex 9; fill #4f7a3e; move (-24, -21); line (-25.76, -16.76); line (-30, -15); line (-34.24, -16.76); line (-36, -21); line (-34.24, -25.24); line (-30, -27); line (-25.76, -25.24); close; move (-12, -15); line (-13.76, -10.76); line (-18, -9); line (-22.24, -10.76); line (-24, -15); line (-22.24, -19.24); line (-18, -21); line (-13.76, -19.24); close; move (0, -9); line (-1.76, -4.76); line (-6, -3); line (-10.24, -4.76); line (-12, -9); line (-10.24, -13.24); line (-6, -15); line (-1.76, -13.24); close; move (12, -3); line (10.24, 1.24); line (6, 3); line (1.76, 1.24); line (0, -3); line (1.76, -7.24); line (6, -9); line (10.24, -7.24); close; move (24, 3); line (22.24, 7.24); line (18, 9); line (13.76, 7.24); line (12, 3); line (13.76, -1.24); line (18, -3); line (22.24, -1.24); close; move (-40, -14); line (-41.76, -9.76); line (-46, -8); line (-50.24, -9.76); line (-52, -14); line (-50.24, -18.24); line (-46, -20); line (-41.76, -18.24); close; move (-54, -7); line (-55.76, -2.76); line (-60, -1); line (-64.24, -2.76); line (-66, -7); line (-64.24, -11.24); line (-60, -13); line (-55.76, -11.24); close; move (-68, 0); line (-69.76, 4.24); line (-74, 6); line (-78.24, 4.24); line (-80, 0); line (-78.24, -4.24); line (-74, -6); line (-69.76, -4.24); close; };
group cafe0Awning {
  zIndex 12;
  path canopy { fill #2f8a86; move (63, -0.5); line (157, 46.5); line (144, 59); line (50, 12); close; };
  path valance { fill #226a68; move (50, 16); line (144, 63); line (144, 59); line (50, 12); close; move (157, 52.5); line (144, 59); line (144, 53); line (157, 46.5); close; };
  path scallop { fill #f4ead6; move (52, 17); line (56, 19); line (56, 17.5); line (52, 15.5); close; move (60, 21); line (64, 23); line (64, 21.5); line (60, 19.5); close; move (68, 25); line (72, 27); line (72, 25.5); line (68, 23.5); close; move (76, 29); line (80, 31); line (80, 29.5); line (76, 27.5); close; move (84, 33); line (88, 35); line (88, 33.5); line (84, 31.5); close; move (92, 37); line (96, 39); line (96, 37.5); line (92, 35.5); close; move (100, 41); line (104, 43); line (104, 41.5); line (100, 39.5); close; move (108, 45); line (112, 47); line (112, 45.5); line (108, 43.5); close; move (116, 49); line (120, 51); line (120, 49.5); line (116, 47.5); close; move (124, 53); line (128, 55); line (128, 53.5); line (124, 51.5); close; move (132, 57); line (136, 59); line (136, 57.5); line (132, 55.5); close; };
};
group cafe0Sign {
  position (71.5, -15.75);
  rotation 52.0181deg;
  scale (1.28078, 0.78078);
  zIndex 12;
  group face {
    rotation -37.9819deg;
    rectangle board { position (0, 0); size (44, 13); cornerRadius 2; fill #2a3b3c; stroke #f4ead6 width 0.8; };
    rectangle glow { position (-1.5, -1.5); size (47, 16); cornerRadius 3; stroke #ec7a62 width 2; opacity 0; };
    text dim { position (22, 7); content "CAFÉ"; fontFamily "sans"; fontSize 10; fontWeight 800; align center; baseline middle; fill #7b8c88; };
    text lit { position (22, 7); content "CAFÉ"; fontFamily "sans"; fontSize 10; fontWeight 800; align center; baseline middle; fill #ffe7a8; };
  };
};
path blade0b { zIndex 12; fill #ec7a62; opacity 0; move (165, 51.5); line (155, 56.5); line (155, 47.5); line (165, 42.5); close; };
path blade0c { zIndex 12; fill #e2a92f; opacity 0; move (245, 91.5); line (235, 96.5); line (235, 87.5); line (245, 82.5); close; };
path blade0d { zIndex 12; fill #2f8a86; opacity 0; move (325, 131.5); line (315, 136.5); line (315, 127.5); line (325, 122.5); close; };
path blade0e { zIndex 12; fill #ec7a62; opacity 0; move (465, 201.5); line (455, 206.5); line (455, 197.5); line (465, 192.5); close; };
path blade0f { zIndex 12; fill #2f8a86; opacity 0; move (565, 251.5); line (555, 256.5); line (555, 247.5); line (565, 242.5); close; };
path blade0g { zIndex 12; fill #e2a92f; opacity 0; move (665, 301.5); line (655, 306.5); line (655, 297.5); line (665, 292.5); close; };
group car0a {
  zIndex 7;
  path shadow { fill #3a2a1a40; move (-9, -13.5); line (27, 4.5); line (8, 14); line (-28, -4); close; };
  path wheels { fill #2b2522; move (-19.5, -2.75); line (-12.5, 0.75); line (-12.5, -4.25); line (-19.5, -7.75); close; move (-1.5, 6.25); line (5.5, 9.75); line (5.5, 4.75); line (-1.5, 1.25); close; move (11, 9.5); line (8, 11); line (8, 7); line (11, 5.5); close; };
  path shade { fill #b98420; move (22, 1); line (8, 8); line (8, 0); line (22, -7); close; move (13, -10.5); line (1, -4.5); line (1, -11.5); line (13, -17.5); close; };
  path body { fill #e2a92f; move (-22, -7); line (8, 8); line (8, 0); line (-22, -15); close; move (-14, -12); line (1, -4.5); line (1, -11.5); line (-14, -19); close; };
  path roof { fill #f0c35a; move (-8, -22); line (22, -7); line (8, 0); line (-22, -15); close; move (-2, -25); line (13, -17.5); line (1, -11.5); line (-14, -19); close; };
  path glass { fill #36505a; move (-12, -12); line (-1, -6.5); line (-1, -11.5); line (-12, -17); close; move (12, -11); line (2, -6); line (2, -11); line (12, -16); close; move (21, -1.5); line (18, 0); line (18, -3); line (21, -4.5); close; move (12, 3); line (9, 4.5); line (9, 1.5); line (12, 0); close; };
};
group car0b {
  zIndex 7;
  path shadow { fill #3a2a1a40; move (-9, -13.5); line (27, 4.5); line (8, 14); line (-28, -4); close; };
  path wheels { fill #2b2522; move (-19.5, -2.75); line (-12.5, 0.75); line (-12.5, -4.25); line (-19.5, -7.75); close; move (-1.5, 6.25); line (5.5, 9.75); line (5.5, 4.75); line (-1.5, 1.25); close; move (11, 9.5); line (8, 11); line (8, 7); line (11, 5.5); close; };
  path shade { fill #c95e49; move (22, 1); line (8, 8); line (8, 0); line (22, -7); close; move (13, -10.5); line (1, -4.5); line (1, -11.5); line (13, -17.5); close; };
  path body { fill #ec7a62; move (-22, -7); line (8, 8); line (8, 0); line (-22, -15); close; move (-14, -12); line (1, -4.5); line (1, -11.5); line (-14, -19); close; };
  path roof { fill #f4a08b; move (-8, -22); line (22, -7); line (8, 0); line (-22, -15); close; move (-2, -25); line (13, -17.5); line (1, -11.5); line (-14, -19); close; };
  path glass { fill #36505a; move (-12, -12); line (-1, -6.5); line (-1, -11.5); line (-12, -17); close; move (12, -11); line (2, -6); line (2, -11); line (12, -16); close; move (21, -1.5); line (18, 0); line (18, -3); line (21, -4.5); close; move (12, 3); line (9, 4.5); line (9, 1.5); line (12, 0); close; };
};
group van0Back {
  zIndex 7;
  visible true;
  path shadow { fill #3a2a1a40; move (-25, -21.5); line (32, 7); line (13, 16.5); line (-44, -12); close; };
  group cabBack {
    opacity 0;
    path wheels { fill #2b2522; move (-36.5, -11.25); line (-29.5, -7.75); line (-29.5, -12.75); line (-36.5, -16.25); close; move (-20.5, -3.25); line (-13.5, 0.25); line (-13.5, -4.75); line (-20.5, -8.25); close; move (-8.5, 2.75); line (-1.5, 6.25); line (-1.5, 1.25); line (-8.5, -2.25); close; };
    path side { fill #b98420; move (-13, -16.5); line (-27, -9.5); line (-27, -23.5); line (-13, -30.5); close; };
    path body { fill #e2a92f; move (-39, -15.5); line (-27, -9.5); line (-27, -23.5); line (-39, -29.5); close; };
    path roof { fill #f0c35a; move (-25, -36.5); line (-13, -30.5); line (-27, -23.5); line (-39, -29.5); close; };
    path glass { fill #36505a; move (-37, -21.5); line (-29, -17.5); line (-29, -23.5); line (-37, -27.5); close; };
  };
  group cabFront {
    path wheels { fill #2b2522; move (-24.5, -5.25); line (-17.5, -1.75); line (-17.5, -6.75); line (-24.5, -10.25); close; move (-8.5, 2.75); line (-1.5, 6.25); line (-1.5, 1.25); line (-8.5, -2.25); close; move (3.5, 8.75); line (10.5, 12.25); line (10.5, 7.25); line (3.5, 3.75); close; };
  };
  path cargoSide { fill #b98420; move (15, -2.5); line (1, 4.5); line (1, -16.5); line (15, -23.5); close; };
  path cargo { fill #e2a92f; move (-27, -9.5); line (1, 4.5); line (1, -16.5); line (-27, -30.5); close; };
  path cargoTop { fill #f0c35a; move (-13, -37.5); line (15, -23.5); line (1, -16.5); line (-27, -30.5); close; };
  path stripe { fill #ec7a62; move (-26, -18); line (0, -5); line (0, -8); line (-26, -21); close; };
  group cab {
    path side { fill #b98420; move (27, 3.5); line (13, 10.5); line (13, -3.5); line (27, -10.5); close; };
    path body { fill #e2a92f; move (1, 4.5); line (13, 10.5); line (13, -3.5); line (1, -9.5); close; };
    path roof { fill #f0c35a; move (15, -16.5); line (27, -10.5); line (13, -3.5); line (1, -9.5); close; };
    path glass { fill #36505a; move (25, -2.5); line (15, 2.5); line (15, -3.5); line (25, -8.5); close; move (3, -1.5); line (11, 2.5); line (11, -3.5); line (3, -7.5); close; };
  };
};
group van0 {
  zIndex 13;
  visible false;
  path shadow { fill #3a2a1a40; move (-25, -21.5); line (32, 7); line (13, 16.5); line (-44, -12); close; };
  group cabBack {
    opacity 0;
    path wheels { fill #2b2522; move (-36.5, -11.25); line (-29.5, -7.75); line (-29.5, -12.75); line (-36.5, -16.25); close; move (-20.5, -3.25); line (-13.5, 0.25); line (-13.5, -4.75); line (-20.5, -8.25); close; move (-8.5, 2.75); line (-1.5, 6.25); line (-1.5, 1.25); line (-8.5, -2.25); close; };
    path side { fill #b98420; move (-13, -16.5); line (-27, -9.5); line (-27, -23.5); line (-13, -30.5); close; };
    path body { fill #e2a92f; move (-39, -15.5); line (-27, -9.5); line (-27, -23.5); line (-39, -29.5); close; };
    path roof { fill #f0c35a; move (-25, -36.5); line (-13, -30.5); line (-27, -23.5); line (-39, -29.5); close; };
    path glass { fill #36505a; move (-37, -21.5); line (-29, -17.5); line (-29, -23.5); line (-37, -27.5); close; };
  };
  group cabFront {
    path wheels { fill #2b2522; move (-24.5, -5.25); line (-17.5, -1.75); line (-17.5, -6.75); line (-24.5, -10.25); close; move (-8.5, 2.75); line (-1.5, 6.25); line (-1.5, 1.25); line (-8.5, -2.25); close; move (3.5, 8.75); line (10.5, 12.25); line (10.5, 7.25); line (3.5, 3.75); close; };
  };
  path cargoSide { fill #b98420; move (15, -2.5); line (1, 4.5); line (1, -16.5); line (15, -23.5); close; };
  path cargo { fill #e2a92f; move (-27, -9.5); line (1, 4.5); line (1, -16.5); line (-27, -30.5); close; };
  path cargoTop { fill #f0c35a; move (-13, -37.5); line (15, -23.5); line (1, -16.5); line (-27, -30.5); close; };
  path stripe { fill #ec7a62; move (-26, -18); line (0, -5); line (0, -8); line (-26, -21); close; };
  group cab {
    path side { fill #b98420; move (27, 3.5); line (13, 10.5); line (13, -3.5); line (27, -10.5); close; };
    path body { fill #e2a92f; move (1, 4.5); line (13, 10.5); line (13, -3.5); line (1, -9.5); close; };
    path roof { fill #f0c35a; move (15, -16.5); line (27, -10.5); line (13, -3.5); line (1, -9.5); close; };
    path glass { fill #36505a; move (25, -2.5); line (15, 2.5); line (15, -3.5); line (25, -8.5); close; move (3, -1.5); line (11, 2.5); line (11, -3.5); line (3, -7.5); close; };
  };
};
group pedA0 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #ec7a62; };
  circle head { position (0, -26.4); radius 3.3; fill #e7b48f; };
};
group pedB0 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #2f8a86; };
  circle head { position (0, -26.4); radius 3.3; fill #c98f6a; };
};
group pedC0 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #5a6d8a; };
  circle head { position (0, -26.4); radius 3.3; fill #d6a07c; };
};
group pedD0 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #e2a92f; };
  circle head { position (0, -26.4); radius 3.3; fill #e7b48f; };
};
group pedE0 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #8a5a8a; };
  circle head { position (0, -26.4); radius 3.3; fill #e7b48f; };
};
group pedF0 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #c95e49; };
  circle head { position (0, -26.4); radius 3.3; fill #c98f6a; };
};
group bike0 {
  zIndex 10;
  ellipse shadow { position (0, 0); size (26, 8); fill #3a2a1a40; };
  path wheels { stroke #2b2522 width 1.3; move (-3, -7.5); line (-3.59, -10.4); line (-5.26, -13.32); line (-7.66, -15.68); line (-10.34, -17.02); line (-12.74, -17.06); line (-14.41, -15.81); line (-15, -13.5); line (-14.41, -10.6); line (-12.74, -7.68); line (-10.34, -5.32); line (-7.66, -3.98); line (-5.26, -3.94); line (-3.59, -5.19); close; move (15, 1.5); line (14.41, -1.4); line (12.74, -4.32); line (10.34, -6.68); line (7.66, -8.02); line (5.26, -8.06); line (3.59, -6.81); line (3, -4.5); line (3.59, -1.6); line (5.26, 1.32); line (7.66, 3.68); line (10.34, 5.02); line (12.74, 5.06); line (14.41, 3.81); close; };
  path frame { stroke #226a68 width 1.6 cap round join round; move (-9, -10.5); line (-1, -7.5); line (4, -13); line (-4, -17); line (-9, -10.5); move (9, -1.5); line (5, -14.5); };
  group rider {
    position (-3, -17.5);
    path legs { pivot (0, 0); fill #2b2522; move (-1, 0); line (1.2, 0); line (5, 8); line (3, 8.6); close; move (-1, 0); line (1, 0); line (-1.5, 8.4); line (-3.2, 7.6); close; };
    rectangle coat { position (-3, -13); size (6.4, 13); cornerRadius 2; fill #ec7a62; rotation 14deg; };
    circle head { position (3.6, -16); radius 3.2; fill #e7b48f; };
  };
};
group gardenA0 {
  position (132, -29);
  zIndex 9;
  ellipse shadow { size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.8, -23); size (7.6, 12.5); cornerRadius 2.4; fill #2f8a86; };
  circle head { position (0, -26.4); radius 3.3; fill #e7b48f; };
  path hat { fill #e2a92f; move (-5, -28); line (5, -28); line (2.5, -31); line (-2.5, -31); close; };
  group arm {
    position (2.5, -19);
    path can { fill #ec7a62; stroke #c95e49 width 0.6; move (0, 0); line (7, 2); line (7, 4); line (9, 4); line (9, 10); line (3, 10); line (3, 4); line (5, 4); line (5, 2.6); line (0, 1.2); close; move (9, 5); line (15, 2); line (15.6, 3); line (9, 7); close; };
    path water { opacity 0; stroke #8fd0e6 width 0.9 cap round; move (15.6, 3.4); line (16.4, 7); move (17.2, 4.2); line (18.4, 8.4); move (16.2, 9); line (16.8, 12); move (18.6, 10); line (19.4, 13.4); };
  };
};
group gardenB0 {
  zIndex 9;
  ellipse shadow { size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.8, -23); size (7.6, 12.5); cornerRadius 2.4; fill #e2a92f; };
  circle head { position (0, -26.4); radius 3.3; fill #c98f6a; };
  path pot { fill #a8714d; move (-5, -18); line (5, -18); line (4, -11); line (-4, -11); close; };
  ellipse plant { position (0, -21); size (11, 7); fill #6f9b4f; };
};
group laundry0 {
  position (542, 157.6);
  zIndex 9;
  path c0 { fill #f4ead6; move (4, 2); line (10, 5); line (10, 14.4); line (4, 10.4); close; };
  path c1 { fill #ec7a62; move (12, 6); line (18, 9); line (18, 16.4); line (12, 14.4); close; };
  path c2 { fill #6fb1aa; move (20, 10); line (26, 13); line (26, 22.4); line (20, 18.4); close; };
  path c3 { fill #f0c35a; move (27, 13.5); line (33, 16.5); line (33, 23.9); line (27, 21.9); close; };
};
path shrubs0 { position (901, 315.5); zIndex 9; fill #4f7a3e; move (-24, -21); line (-25.76, -16.76); line (-30, -15); line (-34.24, -16.76); line (-36, -21); line (-34.24, -25.24); line (-30, -27); line (-25.76, -25.24); close; move (-12, -15); line (-13.76, -10.76); line (-18, -9); line (-22.24, -10.76); line (-24, -15); line (-22.24, -19.24); line (-18, -21); line (-13.76, -19.24); close; move (0, -9); line (-1.76, -4.76); line (-6, -3); line (-10.24, -4.76); line (-12, -9); line (-10.24, -13.24); line (-6, -15); line (-1.76, -13.24); close; move (12, -3); line (10.24, 1.24); line (6, 3); line (1.76, 1.24); line (0, -3); line (1.76, -7.24); line (6, -9); line (10.24, -7.24); close; move (24, 3); line (22.24, 7.24); line (18, 9); line (13.76, 7.24); line (12, 3); line (13.76, -1.24); line (18, -3); line (22.24, -1.24); close; move (-40, -14); line (-41.76, -9.76); line (-46, -8); line (-50.24, -9.76); line (-52, -14); line (-50.24, -18.24); line (-46, -20); line (-41.76, -18.24); close; move (-54, -7); line (-55.76, -2.76); line (-60, -1); line (-64.24, -2.76); line (-66, -7); line (-64.24, -11.24); line (-60, -13); line (-55.76, -11.24); close; move (-68, 0); line (-69.76, 4.24); line (-74, 6); line (-78.24, 4.24); line (-80, 0); line (-78.24, -4.24); line (-74, -6); line (-69.76, -4.24); close; };
group cafe1Awning {
  zIndex 12;
  path canopy { fill #2f8a86; move (943, 439.5); line (1037, 486.5); line (1024, 499); line (930, 452); close; };
  path valance { fill #226a68; move (930, 456); line (1024, 503); line (1024, 499); line (930, 452); close; move (1037, 492.5); line (1024, 499); line (1024, 493); line (1037, 486.5); close; };
  path scallop { fill #f4ead6; move (932, 457); line (936, 459); line (936, 457.5); line (932, 455.5); close; move (940, 461); line (944, 463); line (944, 461.5); line (940, 459.5); close; move (948, 465); line (952, 467); line (952, 465.5); line (948, 463.5); close; move (956, 469); line (960, 471); line (960, 469.5); line (956, 467.5); close; move (964, 473); line (968, 475); line (968, 473.5); line (964, 471.5); close; move (972, 477); line (976, 479); line (976, 477.5); line (972, 475.5); close; move (980, 481); line (984, 483); line (984, 481.5); line (980, 479.5); close; move (988, 485); line (992, 487); line (992, 485.5); line (988, 483.5); close; move (996, 489); line (1000, 491); line (1000, 489.5); line (996, 487.5); close; move (1004, 493); line (1008, 495); line (1008, 493.5); line (1004, 491.5); close; move (1012, 497); line (1016, 499); line (1016, 497.5); line (1012, 495.5); close; };
};
group cafe1Sign {
  position (951.5, 424.25);
  rotation 52.0181deg;
  scale (1.28078, 0.78078);
  zIndex 12;
  group face {
    rotation -37.9819deg;
    rectangle board { position (0, 0); size (44, 13); cornerRadius 2; fill #2a3b3c; stroke #f4ead6 width 0.8; };
    rectangle glow { position (-1.5, -1.5); size (47, 16); cornerRadius 3; stroke #ec7a62 width 2; opacity 0; };
    text dim { position (22, 7); content "CAFÉ"; fontFamily "sans"; fontSize 10; fontWeight 800; align center; baseline middle; fill #7b8c88; };
    text lit { position (22, 7); content "CAFÉ"; fontFamily "sans"; fontSize 10; fontWeight 800; align center; baseline middle; fill #ffe7a8; };
  };
};
path blade1b { zIndex 12; fill #ec7a62; opacity 0; move (1045, 491.5); line (1035, 496.5); line (1035, 487.5); line (1045, 482.5); close; };
path blade1c { zIndex 12; fill #e2a92f; opacity 0; move (1125, 531.5); line (1115, 536.5); line (1115, 527.5); line (1125, 522.5); close; };
path blade1d { zIndex 12; fill #2f8a86; opacity 0; move (1205, 571.5); line (1195, 576.5); line (1195, 567.5); line (1205, 562.5); close; };
path blade1e { zIndex 12; fill #ec7a62; opacity 0; move (1345, 641.5); line (1335, 646.5); line (1335, 637.5); line (1345, 632.5); close; };
path blade1f { zIndex 12; fill #2f8a86; opacity 0; move (1445, 691.5); line (1435, 696.5); line (1435, 687.5); line (1445, 682.5); close; };
path blade1g { zIndex 12; fill #e2a92f; opacity 0; move (1545, 741.5); line (1535, 746.5); line (1535, 737.5); line (1545, 732.5); close; };
group car1a {
  zIndex 7;
  path shadow { fill #3a2a1a40; move (-9, -13.5); line (27, 4.5); line (8, 14); line (-28, -4); close; };
  path wheels { fill #2b2522; move (-19.5, -2.75); line (-12.5, 0.75); line (-12.5, -4.25); line (-19.5, -7.75); close; move (-1.5, 6.25); line (5.5, 9.75); line (5.5, 4.75); line (-1.5, 1.25); close; move (11, 9.5); line (8, 11); line (8, 7); line (11, 5.5); close; };
  path shade { fill #b98420; move (22, 1); line (8, 8); line (8, 0); line (22, -7); close; move (13, -10.5); line (1, -4.5); line (1, -11.5); line (13, -17.5); close; };
  path body { fill #e2a92f; move (-22, -7); line (8, 8); line (8, 0); line (-22, -15); close; move (-14, -12); line (1, -4.5); line (1, -11.5); line (-14, -19); close; };
  path roof { fill #f0c35a; move (-8, -22); line (22, -7); line (8, 0); line (-22, -15); close; move (-2, -25); line (13, -17.5); line (1, -11.5); line (-14, -19); close; };
  path glass { fill #36505a; move (-12, -12); line (-1, -6.5); line (-1, -11.5); line (-12, -17); close; move (12, -11); line (2, -6); line (2, -11); line (12, -16); close; move (21, -1.5); line (18, 0); line (18, -3); line (21, -4.5); close; move (12, 3); line (9, 4.5); line (9, 1.5); line (12, 0); close; };
};
group car1b {
  zIndex 7;
  path shadow { fill #3a2a1a40; move (-9, -13.5); line (27, 4.5); line (8, 14); line (-28, -4); close; };
  path wheels { fill #2b2522; move (-19.5, -2.75); line (-12.5, 0.75); line (-12.5, -4.25); line (-19.5, -7.75); close; move (-1.5, 6.25); line (5.5, 9.75); line (5.5, 4.75); line (-1.5, 1.25); close; move (11, 9.5); line (8, 11); line (8, 7); line (11, 5.5); close; };
  path shade { fill #c95e49; move (22, 1); line (8, 8); line (8, 0); line (22, -7); close; move (13, -10.5); line (1, -4.5); line (1, -11.5); line (13, -17.5); close; };
  path body { fill #ec7a62; move (-22, -7); line (8, 8); line (8, 0); line (-22, -15); close; move (-14, -12); line (1, -4.5); line (1, -11.5); line (-14, -19); close; };
  path roof { fill #f4a08b; move (-8, -22); line (22, -7); line (8, 0); line (-22, -15); close; move (-2, -25); line (13, -17.5); line (1, -11.5); line (-14, -19); close; };
  path glass { fill #36505a; move (-12, -12); line (-1, -6.5); line (-1, -11.5); line (-12, -17); close; move (12, -11); line (2, -6); line (2, -11); line (12, -16); close; move (21, -1.5); line (18, 0); line (18, -3); line (21, -4.5); close; move (12, 3); line (9, 4.5); line (9, 1.5); line (12, 0); close; };
};
group van1Back {
  zIndex 7;
  visible true;
  path shadow { fill #3a2a1a40; move (-25, -21.5); line (32, 7); line (13, 16.5); line (-44, -12); close; };
  group cabBack {
    opacity 0;
    path wheels { fill #2b2522; move (-36.5, -11.25); line (-29.5, -7.75); line (-29.5, -12.75); line (-36.5, -16.25); close; move (-20.5, -3.25); line (-13.5, 0.25); line (-13.5, -4.75); line (-20.5, -8.25); close; move (-8.5, 2.75); line (-1.5, 6.25); line (-1.5, 1.25); line (-8.5, -2.25); close; };
    path side { fill #b98420; move (-13, -16.5); line (-27, -9.5); line (-27, -23.5); line (-13, -30.5); close; };
    path body { fill #e2a92f; move (-39, -15.5); line (-27, -9.5); line (-27, -23.5); line (-39, -29.5); close; };
    path roof { fill #f0c35a; move (-25, -36.5); line (-13, -30.5); line (-27, -23.5); line (-39, -29.5); close; };
    path glass { fill #36505a; move (-37, -21.5); line (-29, -17.5); line (-29, -23.5); line (-37, -27.5); close; };
  };
  group cabFront {
    path wheels { fill #2b2522; move (-24.5, -5.25); line (-17.5, -1.75); line (-17.5, -6.75); line (-24.5, -10.25); close; move (-8.5, 2.75); line (-1.5, 6.25); line (-1.5, 1.25); line (-8.5, -2.25); close; move (3.5, 8.75); line (10.5, 12.25); line (10.5, 7.25); line (3.5, 3.75); close; };
  };
  path cargoSide { fill #b98420; move (15, -2.5); line (1, 4.5); line (1, -16.5); line (15, -23.5); close; };
  path cargo { fill #e2a92f; move (-27, -9.5); line (1, 4.5); line (1, -16.5); line (-27, -30.5); close; };
  path cargoTop { fill #f0c35a; move (-13, -37.5); line (15, -23.5); line (1, -16.5); line (-27, -30.5); close; };
  path stripe { fill #ec7a62; move (-26, -18); line (0, -5); line (0, -8); line (-26, -21); close; };
  group cab {
    path side { fill #b98420; move (27, 3.5); line (13, 10.5); line (13, -3.5); line (27, -10.5); close; };
    path body { fill #e2a92f; move (1, 4.5); line (13, 10.5); line (13, -3.5); line (1, -9.5); close; };
    path roof { fill #f0c35a; move (15, -16.5); line (27, -10.5); line (13, -3.5); line (1, -9.5); close; };
    path glass { fill #36505a; move (25, -2.5); line (15, 2.5); line (15, -3.5); line (25, -8.5); close; move (3, -1.5); line (11, 2.5); line (11, -3.5); line (3, -7.5); close; };
  };
};
group van1 {
  zIndex 13;
  visible false;
  path shadow { fill #3a2a1a40; move (-25, -21.5); line (32, 7); line (13, 16.5); line (-44, -12); close; };
  group cabBack {
    opacity 0;
    path wheels { fill #2b2522; move (-36.5, -11.25); line (-29.5, -7.75); line (-29.5, -12.75); line (-36.5, -16.25); close; move (-20.5, -3.25); line (-13.5, 0.25); line (-13.5, -4.75); line (-20.5, -8.25); close; move (-8.5, 2.75); line (-1.5, 6.25); line (-1.5, 1.25); line (-8.5, -2.25); close; };
    path side { fill #b98420; move (-13, -16.5); line (-27, -9.5); line (-27, -23.5); line (-13, -30.5); close; };
    path body { fill #e2a92f; move (-39, -15.5); line (-27, -9.5); line (-27, -23.5); line (-39, -29.5); close; };
    path roof { fill #f0c35a; move (-25, -36.5); line (-13, -30.5); line (-27, -23.5); line (-39, -29.5); close; };
    path glass { fill #36505a; move (-37, -21.5); line (-29, -17.5); line (-29, -23.5); line (-37, -27.5); close; };
  };
  group cabFront {
    path wheels { fill #2b2522; move (-24.5, -5.25); line (-17.5, -1.75); line (-17.5, -6.75); line (-24.5, -10.25); close; move (-8.5, 2.75); line (-1.5, 6.25); line (-1.5, 1.25); line (-8.5, -2.25); close; move (3.5, 8.75); line (10.5, 12.25); line (10.5, 7.25); line (3.5, 3.75); close; };
  };
  path cargoSide { fill #b98420; move (15, -2.5); line (1, 4.5); line (1, -16.5); line (15, -23.5); close; };
  path cargo { fill #e2a92f; move (-27, -9.5); line (1, 4.5); line (1, -16.5); line (-27, -30.5); close; };
  path cargoTop { fill #f0c35a; move (-13, -37.5); line (15, -23.5); line (1, -16.5); line (-27, -30.5); close; };
  path stripe { fill #ec7a62; move (-26, -18); line (0, -5); line (0, -8); line (-26, -21); close; };
  group cab {
    path side { fill #b98420; move (27, 3.5); line (13, 10.5); line (13, -3.5); line (27, -10.5); close; };
    path body { fill #e2a92f; move (1, 4.5); line (13, 10.5); line (13, -3.5); line (1, -9.5); close; };
    path roof { fill #f0c35a; move (15, -16.5); line (27, -10.5); line (13, -3.5); line (1, -9.5); close; };
    path glass { fill #36505a; move (25, -2.5); line (15, 2.5); line (15, -3.5); line (25, -8.5); close; move (3, -1.5); line (11, 2.5); line (11, -3.5); line (3, -7.5); close; };
  };
};
group pedA1 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #ec7a62; };
  circle head { position (0, -26.4); radius 3.3; fill #e7b48f; };
};
group pedB1 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #2f8a86; };
  circle head { position (0, -26.4); radius 3.3; fill #c98f6a; };
};
group pedC1 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #5a6d8a; };
  circle head { position (0, -26.4); radius 3.3; fill #d6a07c; };
};
group pedD1 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #e2a92f; };
  circle head { position (0, -26.4); radius 3.3; fill #e7b48f; };
};
group pedE1 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #8a5a8a; };
  circle head { position (0, -26.4); radius 3.3; fill #e7b48f; };
};
group pedF1 {
  zIndex 11;
  ellipse shadow { position (0, 0); size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill #c95e49; };
  circle head { position (0, -26.4); radius 3.3; fill #c98f6a; };
};
group bike1 {
  zIndex 10;
  ellipse shadow { position (0, 0); size (26, 8); fill #3a2a1a40; };
  path wheels { stroke #2b2522 width 1.3; move (-3, -7.5); line (-3.59, -10.4); line (-5.26, -13.32); line (-7.66, -15.68); line (-10.34, -17.02); line (-12.74, -17.06); line (-14.41, -15.81); line (-15, -13.5); line (-14.41, -10.6); line (-12.74, -7.68); line (-10.34, -5.32); line (-7.66, -3.98); line (-5.26, -3.94); line (-3.59, -5.19); close; move (15, 1.5); line (14.41, -1.4); line (12.74, -4.32); line (10.34, -6.68); line (7.66, -8.02); line (5.26, -8.06); line (3.59, -6.81); line (3, -4.5); line (3.59, -1.6); line (5.26, 1.32); line (7.66, 3.68); line (10.34, 5.02); line (12.74, 5.06); line (14.41, 3.81); close; };
  path frame { stroke #226a68 width 1.6 cap round join round; move (-9, -10.5); line (-1, -7.5); line (4, -13); line (-4, -17); line (-9, -10.5); move (9, -1.5); line (5, -14.5); };
  group rider {
    position (-3, -17.5);
    path legs { pivot (0, 0); fill #2b2522; move (-1, 0); line (1.2, 0); line (5, 8); line (3, 8.6); close; move (-1, 0); line (1, 0); line (-1.5, 8.4); line (-3.2, 7.6); close; };
    rectangle coat { position (-3, -13); size (6.4, 13); cornerRadius 2; fill #ec7a62; rotation 14deg; };
    circle head { position (3.6, -16); radius 3.2; fill #e7b48f; };
  };
};
group gardenA1 {
  position (1012, 411);
  zIndex 9;
  ellipse shadow { size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.8, -23); size (7.6, 12.5); cornerRadius 2.4; fill #2f8a86; };
  circle head { position (0, -26.4); radius 3.3; fill #e7b48f; };
  path hat { fill #e2a92f; move (-5, -28); line (5, -28); line (2.5, -31); line (-2.5, -31); close; };
  group arm {
    position (2.5, -19);
    path can { fill #ec7a62; stroke #c95e49 width 0.6; move (0, 0); line (7, 2); line (7, 4); line (9, 4); line (9, 10); line (3, 10); line (3, 4); line (5, 4); line (5, 2.6); line (0, 1.2); close; move (9, 5); line (15, 2); line (15.6, 3); line (9, 7); close; };
    path water { opacity 0; stroke #8fd0e6 width 0.9 cap round; move (15.6, 3.4); line (16.4, 7); move (17.2, 4.2); line (18.4, 8.4); move (16.2, 9); line (16.8, 12); move (18.6, 10); line (19.4, 13.4); };
  };
};
group gardenB1 {
  zIndex 9;
  ellipse shadow { size (14, 6); fill #3a2a1a40; };
  path legs { fill #2b2522; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.8, -23); size (7.6, 12.5); cornerRadius 2.4; fill #e2a92f; };
  circle head { position (0, -26.4); radius 3.3; fill #c98f6a; };
  path pot { fill #a8714d; move (-5, -18); line (5, -18); line (4, -11); line (-4, -11); close; };
  ellipse plant { position (0, -21); size (11, 7); fill #6f9b4f; };
};
group laundry1 {
  position (1422, 597.6);
  zIndex 9;
  path c0 { fill #f4ead6; move (4, 2); line (10, 5); line (10, 14.4); line (4, 10.4); close; };
  path c1 { fill #ec7a62; move (12, 6); line (18, 9); line (18, 16.4); line (12, 14.4); close; };
  path c2 { fill #6fb1aa; move (20, 10); line (26, 13); line (26, 22.4); line (20, 18.4); close; };
  path c3 { fill #f0c35a; move (27, 13.5); line (33, 16.5); line (33, 23.9); line (27, 21.9); close; };
};
path shrubs1 { position (1781, 755.5); zIndex 9; fill #4f7a3e; move (-24, -21); line (-25.76, -16.76); line (-30, -15); line (-34.24, -16.76); line (-36, -21); line (-34.24, -25.24); line (-30, -27); line (-25.76, -25.24); close; move (-12, -15); line (-13.76, -10.76); line (-18, -9); line (-22.24, -10.76); line (-24, -15); line (-22.24, -19.24); line (-18, -21); line (-13.76, -19.24); close; move (0, -9); line (-1.76, -4.76); line (-6, -3); line (-10.24, -4.76); line (-12, -9); line (-10.24, -13.24); line (-6, -15); line (-1.76, -13.24); close; move (12, -3); line (10.24, 1.24); line (6, 3); line (1.76, 1.24); line (0, -3); line (1.76, -7.24); line (6, -9); line (10.24, -7.24); close; move (24, 3); line (22.24, 7.24); line (18, 9); line (13.76, 7.24); line (12, 3); line (13.76, -1.24); line (18, -3); line (22.24, -1.24); close; move (-40, -14); line (-41.76, -9.76); line (-46, -8); line (-50.24, -9.76); line (-52, -14); line (-50.24, -18.24); line (-46, -20); line (-41.76, -18.24); close; move (-54, -7); line (-55.76, -2.76); line (-60, -1); line (-64.24, -2.76); line (-66, -7); line (-64.24, -11.24); line (-60, -13); line (-55.76, -11.24); close; move (-68, 0); line (-69.76, 4.24); line (-74, 6); line (-78.24, 4.24); line (-80, 0); line (-78.24, -4.24); line (-74, -6); line (-69.76, -4.24); close; };
group captions {
  space screen;
  zIndex 60;
  rectangle plate { position (250, 666); size (780, 32); cornerRadius 8; fill #2b2522; opacity 0.62; };
  text cap1 { position (640, 682); content "Sound: soft city ambience, a bicycle freewheel, a distant train rumble"; fontFamily "sans"; fontSize 15; fontWeight 600; align center; baseline middle; fill #fbf3e4; opacity 0; };
  text cap2 { position (640, 682); content "Sound: a quiet engine idle and a brief shop-door bell"; fontFamily "sans"; fontSize 15; fontWeight 600; align center; baseline middle; fill #fbf3e4; opacity 0; };
  text cap3 { position (640, 682); content "Sound: the train rumble grows; leaves and laundry flutter"; fontFamily "sans"; fontSize 15; fontWeight 600; align center; baseline middle; fill #fbf3e4; opacity 0; };
  text cap4 { position (640, 682); content "Sound: an even wheel rhythm, softened behind the buildings"; fontFamily "sans"; fontSize 15; fontWeight 600; align center; baseline middle; fill #fbf3e4; opacity 0; };
  text cap5 { position (640, 682); content "Sound: the train recedes; café and street sounds return"; fontFamily "sans"; fontSize 15; fontWeight 600; align center; baseline middle; fill #fbf3e4; opacity 0; };
  text cap6 { position (640, 682); content "Sound: soft city ambience, a bicycle freewheel, a distant train rumble"; fontFamily "sans"; fontSize 15; fontWeight 600; align center; baseline middle; fill #fbf3e4; opacity 0; };
};
keyframes camera(main).position.x {
  start 0s;
  duration 30s;
  0% 50 ease hold;
  1.6667% 50 ease cubic(0.3333, 0, 0.6667, 0.3393);
  6.6667% 78 ease cubic(0.3333, 0.3333, 0.6667, 0.6667);
  31.3333% 351.8 ease cubic(0.3333, 1.177, 0.6667, 0.7455);
  46.6667% 400 ease cubic(0.3333, 0.6, 0.6667, 0.4);
  49.6667% 404 ease cubic(0.3333, 0.0292, 0.6667, 0.3333);
  50.6667% 431.365 ease cubic(0.3333, 0.3333, 0.6667, 0.6667);
  51.6667% 486.096 ease cubic(0.3333, 0.6667, 0.6667, 0.9854);
  52.6667% 513.461 ease cubic(0.3333, 0.3386, 0.6667, 0.5768);
  66.6667% 530 ease cubic(0.3333, 0.2778, 0.6667, -0.2222);
  76.6667% 548 ease cubic(0.3333, 0.1438, 0.6667, 0.5425);
  83.3333% 650 ease cubic(0.3333, 0.375, 0.6667, 1);
  98.3333% 930 ease hold;
  100% 930;
};
keyframes camera(main).position.y {
  start 0s;
  duration 30s;
  0% 2 ease hold;
  1.6667% 2 ease cubic(0.3333, 0, 0.6667, 0.3393);
  6.6667% 16 ease cubic(0.3333, 0.3333, 0.6667, 0.6667);
  31.3333% 152.9 ease cubic(0.3333, -0.2757, 0.6667, 0.9702);
  46.6667% 50 ease cubic(0.3333, -0.3, 0.6667, 0.4);
  49.6667% 52 ease cubic(0.3333, 0.0292, 0.6667, 0.3333);
  50.6667% 65.683 ease cubic(0.3333, 0.3333, 0.6667, 0.6667);
  51.6667% 93.048 ease cubic(0.3333, 0.6667, 0.6667, 0.9854);
  52.6667% 106.731 ease cubic(0.3333, 0.3386, 0.6667, 0.5768);
  66.6667% 115 ease cubic(0.3333, 0.0253, 0.6667, 0.5859);
  76.6667% 214 ease cubic(0.3333, 0.3106, 0.6667, 0.7348);
  83.3333% 302 ease cubic(0.3333, 0.375, 0.6667, 1);
  98.3333% 442 ease hold;
  100% 442;
};
keyframes camera(main).zoom {
  start 0s;
  duration 30s;
  0% 2 ease hold;
  31.3333% 2 ease cubic(0.3333, 0, 0.6667, 1);
  46.6667% 0.8 ease hold;
  66.6667% 0.8 ease cubic(0.3333, 0, 0.6667, 0.6739);
  76.6667% 1.72 ease cubic(0.3333, 0.7143, 0.6667, 1);
  83.3333% 2 ease hold;
  100% 2;
};
keyframes captions.cap1.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  15.5% 1 ease easeIn;
  16.3333% 0 ease hold;
  100% 0;
};
keyframes captions.cap2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  17% 0 ease easeOut;
  17.8333% 1 ease hold;
  32.1667% 1 ease easeIn;
  33% 0 ease hold;
  100% 0;
};
keyframes captions.cap3.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  33.6667% 0 ease easeOut;
  34.5% 1 ease hold;
  48.8333% 1 ease easeIn;
  49.6667% 0 ease hold;
  100% 0;
};
keyframes captions.cap4.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  50.3333% 0 ease easeOut;
  51.1667% 1 ease hold;
  65.5% 1 ease easeIn;
  66.3333% 0 ease hold;
  100% 0;
};
keyframes captions.cap5.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  67% 0 ease easeOut;
  67.8333% 1 ease hold;
  82.1667% 1 ease easeIn;
  83% 0 ease hold;
  100% 0;
};
keyframes captions.cap6.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  83.6667% 0 ease easeOut;
  84.5% 1 ease hold;
  100% 1;
};
animate cafem1Sign.face.lit.opacity {
  expression "clamp(0.5 + 7 * sin(t * 3.14159 + 1.5708), 0, 1)";
  start 0s;
  duration 30s;
};
animate cafem1Sign.face.glow.opacity {
  expression "clamp(0.5 - 7 * sin(t * 3.14159 + 1.5708), 0, 1)";
  start 0s;
  duration 30s;
};
animate bladem1b.opacity {
  expression "clamp(0.5 + 7 * sin(t * 1.25664 + 0.465), 0, 1)";
  start 0s;
  duration 30s;
};
animate bladem1c.opacity {
  expression "clamp(0.5 + 7 * sin(t * 1.0472 + 0.7749), 0, 1)";
  start 0s;
  duration 30s;
};
animate bladem1d.opacity {
  expression "clamp(0.5 + 7 * sin(t * 3.14159 + 3.4872), 0, 1)";
  start 0s;
  duration 30s;
};
animate bladem1e.opacity {
  expression "clamp(0.5 + 7 * sin(t * 2.0944 + 3.0997), 0, 1)";
  start 0s;
  duration 30s;
};
animate bladem1f.opacity {
  expression "clamp(0.5 + 7 * sin(t * 1.25664 + 2.3248), 0, 1)";
  start 0s;
  duration 30s;
};
animate bladem1g.opacity {
  expression "clamp(0.5 + 7 * sin(t * 2.0944 + 4.6496), 0, 1)";
  start 0s;
  duration 30s;
};
animate carm1a.position.x {
  expression "-730 - 163 * clamp((((t + 2.05) % 15) - 0) * 0.4474, 0, 1) + 384 * clamp((((t + 2.05) % 15) - 2.235) * 0.1899, 0, 1) + 163 * clamp((((t + 2.05) % 15) - 7.5) * 0.4474, 0, 1) - 384 * clamp((((t + 2.05) % 15) - 9.735) * 0.1899, 0, 1)";
  start 0s;
  duration 30s;
};
animate carm1a.position.y {
  expression "-475 + 81.5 * clamp((((t + 2.05) % 15) - 0) * 0.4474, 0, 1) + 192 * clamp((((t + 2.05) % 15) - 2.235) * 0.1899, 0, 1) - 81.5 * clamp((((t + 2.05) % 15) - 7.5) * 0.4474, 0, 1) - 192 * clamp((((t + 2.05) % 15) - 9.735) * 0.1899, 0, 1)";
  start 0s;
  duration 30s;
};
animate carm1a.scale.x {
  expression "-1 + 2 * clamp((((t + 2.05) % 15) - 2.075) * 3.125, 0, 1) - 2 * clamp((((t + 2.05) % 15) - 7.34) * 3.125, 0, 1) + 2 * clamp((((t + 2.05) % 15) - 9.575) * 3.125, 0, 1) - 2 * clamp((((t + 2.05) % 15) - 9.895) * 0.1959, 0, 1)";
  start 0s;
  duration 30s;
};
animate carm1a.opacity {
  expression "1 - 1 * clamp((((t + 2.05) % 15) - 9.735) * 100, 0, 1) + 1 * clamp((((t + 2.05) % 15) - 14.99) * 100, 0, 1)";
  start 0s;
  duration 30s;
};
animate carm1b.position.x {
  expression "-324 - 163 * clamp((((t + 3) % 15) - 0) * 0.508, 0, 1) + 458 * clamp((((t + 3) % 15) - 1.969) * 0.1808, 0, 1) + 163 * clamp((((t + 3) % 15) - 7.5) * 0.508, 0, 1) - 458 * clamp((((t + 3) % 15) - 9.469) * 0.1808, 0, 1)";
  start 0s;
  duration 30s;
};
animate carm1b.position.y {
  expression "-272 + 81.5 * clamp((((t + 3) % 15) - 0) * 0.508, 0, 1) + 229 * clamp((((t + 3) % 15) - 1.969) * 0.1808, 0, 1) - 81.5 * clamp((((t + 3) % 15) - 7.5) * 0.508, 0, 1) - 229 * clamp((((t + 3) % 15) - 9.469) * 0.1808, 0, 1)";
  start 0s;
  duration 30s;
};
animate carm1b.scale.x {
  expression "-1 + 2 * clamp((((t + 3) % 15) - 1.809) * 3.125, 0, 1) - 2 * clamp((((t + 3) % 15) - 7.34) * 3.125, 0, 1) + 2 * clamp((((t + 3) % 15) - 9.309) * 3.125, 0, 1) - 2 * clamp((((t + 3) % 15) - 9.629) * 0.1862, 0, 1)";
  start 0s;
  duration 30s;
};
animate carm1b.opacity {
  expression "1 - 1 * clamp((((t + 3) % 15) - 9.469) * 100, 0, 1) + 1 * clamp((((t + 3) % 15) - 14.99) * 100, 0, 1)";
  start 0s;
  duration 30s;
};
animate vanm1Back.position.x {
  expression "-758 - 46 * clamp(((t % 30) - 0) * 0.2273, 0, 1) - 61 * clamp(((t % 30) - 4.4) * 1.1111, 0, 1) + 140 * clamp(((t % 30) - 5.3) * 0.5882, 0, 1) * (2 - clamp(((t % 30) - 5.3) * 0.5882, 0, 1)) + 255 * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) + 133 * clamp(((t % 30) - 21.8) * 0.8333, 0, 1) - 395 * clamp(((t % 30) - 23) * 0.25, 0, 1) - 26 * clamp(((t % 30) - 27) * 0.3333, 0, 1)";
  start 0s;
  duration 30s;
};
animate vanm1Back.position.y {
  expression "-465 + 23 * clamp(((t % 30) - 0) * 0.2273, 0, 1) + 30.5 * clamp(((t % 30) - 4.4) * 1.1111, 0, 1) + 70 * clamp(((t % 30) - 5.3) * 0.5882, 0, 1) * (2 - clamp(((t % 30) - 5.3) * 0.5882, 0, 1)) + 127.5 * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) - 66.5 * clamp(((t % 30) - 21.8) * 0.8333, 0, 1) - 197.5 * clamp(((t % 30) - 23) * 0.25, 0, 1) + 13 * clamp(((t % 30) - 27) * 0.3333, 0, 1)";
  start 0s;
  duration 30s;
};
animate vanm1Back.opacity {
  expression "1 - 1 * clamp(((t % 30) - 23) * 100, 0, 1) + 1 * clamp(((t % 30) - 26.99) * 100, 0, 1)";
  start 0s;
  duration 30s;
};
animate vanm1Back.scale.x {
  expression "-1 + 2 * clamp(((t % 30) - 5.1) * 2.5, 0, 1) - 2 * clamp(((t % 30) - 21.6) * 2.5, 0, 1) + 2 * clamp(((t % 30) - 22.8) * 2.5, 0, 1) - 2 * clamp(((t % 30) - 26.8) * 2.5, 0, 1)";
  start 0s;
  duration 30s;
};
animate vanm1Back.cab.opacity {
  expression "1 - 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) + 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate vanm1Back.cabFront.opacity {
  expression "1 - 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) + 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate vanm1Back.cabBack.opacity {
  expression "0 + 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) - 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate vanm1.position.x {
  expression "-758 - 46 * clamp(((t % 30) - 0) * 0.2273, 0, 1) - 61 * clamp(((t % 30) - 4.4) * 1.1111, 0, 1) + 140 * clamp(((t % 30) - 5.3) * 0.5882, 0, 1) * (2 - clamp(((t % 30) - 5.3) * 0.5882, 0, 1)) + 255 * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) + 133 * clamp(((t % 30) - 21.8) * 0.8333, 0, 1) - 395 * clamp(((t % 30) - 23) * 0.25, 0, 1) - 26 * clamp(((t % 30) - 27) * 0.3333, 0, 1)";
  start 0s;
  duration 30s;
};
animate vanm1.position.y {
  expression "-465 + 23 * clamp(((t % 30) - 0) * 0.2273, 0, 1) + 30.5 * clamp(((t % 30) - 4.4) * 1.1111, 0, 1) + 70 * clamp(((t % 30) - 5.3) * 0.5882, 0, 1) * (2 - clamp(((t % 30) - 5.3) * 0.5882, 0, 1)) + 127.5 * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) - 66.5 * clamp(((t % 30) - 21.8) * 0.8333, 0, 1) - 197.5 * clamp(((t % 30) - 23) * 0.25, 0, 1) + 13 * clamp(((t % 30) - 27) * 0.3333, 0, 1)";
  start 0s;
  duration 30s;
};
animate vanm1.opacity {
  expression "1 - 1 * clamp(((t % 30) - 23) * 100, 0, 1) + 1 * clamp(((t % 30) - 26.99) * 100, 0, 1)";
  start 0s;
  duration 30s;
};
animate vanm1.scale.x {
  expression "-1 + 2 * clamp(((t % 30) - 5.1) * 2.5, 0, 1) - 2 * clamp(((t % 30) - 21.6) * 2.5, 0, 1) + 2 * clamp(((t % 30) - 22.8) * 2.5, 0, 1) - 2 * clamp(((t % 30) - 26.8) * 2.5, 0, 1)";
  start 0s;
  duration 30s;
};
animate vanm1.cab.opacity {
  expression "1 - 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) + 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate vanm1.cabFront.opacity {
  expression "1 - 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) + 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate vanm1.cabBack.opacity {
  expression "0 + 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) - 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedAm1.position.x {
  expression "-889.21 - 10.79 * clamp(((t % 30) - 0) * 1.25, 0, 1) + 87 * clamp(((t % 30) - 0.8) * 0.2632, 0, 1) + 178 * clamp(((t % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp(((t % 30) - 13.8) * 0.2632, 0, 1) - 167.21 * clamp(((t % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedAm1.position.y {
  expression "-350.61 - 5.39 * clamp(((t % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp(((t % 30) - 0.8) * 0.2632, 0, 1) + 89 * clamp(((t % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp(((t % 30) - 13.8) * 0.2632, 0, 1) - 83.61 * clamp(((t % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedAm1.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 0)) * (1 - 1 * clamp(((t % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp(((t % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedBm1.position.x {
  expression "-885.21 - 10.79 * clamp((((t + 29.45) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 29.45) % 30) - 0.8) * 0.2632, 0, 1) + 178 * clamp((((t + 29.45) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 29.45) % 30) - 13.8) * 0.2632, 0, 1) - 167.21 * clamp((((t + 29.45) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedBm1.position.y {
  expression "-345.61 - 5.39 * clamp((((t + 29.45) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 29.45) % 30) - 0.8) * 0.2632, 0, 1) + 89 * clamp((((t + 29.45) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 29.45) % 30) - 13.8) * 0.2632, 0, 1) - 83.61 * clamp((((t + 29.45) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedBm1.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 91.3)) * (1 - 1 * clamp((((t + 29.45) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 29.45) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedCm1.position.x {
  expression "-889.21 - 10.79 * clamp((((t + 29.24) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 29.24) % 30) - 0.8) * 0.2632, 0, 1) + 178 * clamp((((t + 29.24) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 29.24) % 30) - 13.8) * 0.2632, 0, 1) - 167.21 * clamp((((t + 29.24) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedCm1.position.y {
  expression "-350.61 - 5.39 * clamp((((t + 29.24) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 29.24) % 30) - 0.8) * 0.2632, 0, 1) + 89 * clamp((((t + 29.24) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 29.24) % 30) - 13.8) * 0.2632, 0, 1) - 83.61 * clamp((((t + 29.24) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedCm1.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 90.65)) * (1 - 1 * clamp((((t + 29.24) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 29.24) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedDm1.position.x {
  expression "-890.21 - 10.79 * clamp((((t + 29.698) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 29.698) % 30) - 0.8) * 0.2632, 0, 1) + 178 * clamp((((t + 29.698) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 29.698) % 30) - 13.8) * 0.2632, 0, 1) - 167.21 * clamp((((t + 29.698) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedDm1.position.y {
  expression "-354.11 - 5.39 * clamp((((t + 29.698) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 29.698) % 30) - 0.8) * 0.2632, 0, 1) + 89 * clamp((((t + 29.698) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 29.698) % 30) - 13.8) * 0.2632, 0, 1) - 83.61 * clamp((((t + 29.698) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedDm1.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 92.06)) * (1 - 1 * clamp((((t + 29.698) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 29.698) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedEm1.position.x {
  expression "-488.73 - 11.27 * clamp((((t + 7) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 7) % 30) - 0.8) * 0.2632, 0, 1) + 186 * clamp((((t + 7) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 7) % 30) - 13.8) * 0.2632, 0, 1) - 174.73 * clamp((((t + 7) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedEm1.position.y {
  expression "-150.36 - 5.64 * clamp((((t + 7) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 7) % 30) - 0.8) * 0.2632, 0, 1) + 93 * clamp((((t + 7) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 7) % 30) - 13.8) * 0.2632, 0, 1) - 87.36 * clamp((((t + 7) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedEm1.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 21.7)) * (1 - 1 * clamp((((t + 7) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 7) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedFm1.position.x {
  expression "-484.73 - 11.27 * clamp((((t + 6.45) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 6.45) % 30) - 0.8) * 0.2632, 0, 1) + 186 * clamp((((t + 6.45) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 6.45) % 30) - 13.8) * 0.2632, 0, 1) - 174.73 * clamp((((t + 6.45) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedFm1.position.y {
  expression "-145.36 - 5.64 * clamp((((t + 6.45) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 6.45) % 30) - 0.8) * 0.2632, 0, 1) + 93 * clamp((((t + 6.45) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 6.45) % 30) - 13.8) * 0.2632, 0, 1) - 87.36 * clamp((((t + 6.45) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedFm1.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 20)) * (1 - 1 * clamp((((t + 6.45) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 6.45) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate bikem1.position.x {
  expression "-948 + ((t * 58.66667 + 0) % 2640)";
  start 0s;
  duration 30s;
};
animate bikem1.position.y {
  expression "-406 + 0.5 * ((t * 58.66667 + 0) % 2640)";
  start 0s;
  duration 30s;
};
animate bikem1.rider.legs.rotation {
  expression "0.35 * sin(t * 9.42478)";
  start 0s;
  duration 30s;
};
animate gardenAm1.arm.rotation {
  expression "0 - 0.85 * clamp(((t % 10) - 1.6) * 1.6667, 0, 1) * clamp(((t % 10) - 1.6) * 1.6667, 0, 1) * (3 - 2 * clamp(((t % 10) - 1.6) * 1.6667, 0, 1)) + 0.85 * clamp(((t % 10) - 3.2) * 1.6667, 0, 1) * clamp(((t % 10) - 3.2) * 1.6667, 0, 1) * (3 - 2 * clamp(((t % 10) - 3.2) * 1.6667, 0, 1))";
  start 0s;
  duration 30s;
};
animate gardenAm1.arm.water.opacity {
  expression "0 + 1 * clamp(((t % 10) - 2.1) * 5, 0, 1) - 1 * clamp(((t % 10) - 3.15) * 5, 0, 1)";
  start 0s;
  duration 30s;
};
animate gardenBm1.position.x {
  expression "-584 + 16 * clamp(((t % 15) - 2.5) * 0.5263, 0, 1) - 16 * clamp(((t % 15) - 7.4) * 0.5, 0, 1)";
  start 0s;
  duration 30s;
};
animate gardenBm1.position.y {
  expression "-377 + 8 * clamp(((t % 15) - 2.5) * 0.5263, 0, 1) - 8 * clamp(((t % 15) - 7.4) * 0.5, 0, 1)";
  start 0s;
  duration 30s;
};
animate laundrym1.scale.y {
  expression "1 - 0.08 * sin(t * 4.18879) * sin(t * 4.18879)";
  start 0s;
  duration 30s;
};
animate laundrym1.position.x {
  expression "-338 + 0.6 * sin(t * 2.0944)";
  start 0s;
  duration 30s;
};
animate shrubsm1.scale.x {
  expression "1 + 0.035 * sin(t * 2.51327)";
  start 0s;
  duration 30s;
};
animate cafe0Sign.face.lit.opacity {
  expression "clamp(0.5 + 7 * sin(t * 3.14159 + 1.5708), 0, 1)";
  start 0s;
  duration 30s;
};
animate cafe0Sign.face.glow.opacity {
  expression "clamp(0.5 - 7 * sin(t * 3.14159 + 1.5708), 0, 1)";
  start 0s;
  duration 30s;
};
animate blade0b.opacity {
  expression "clamp(0.5 + 7 * sin(t * 1.25664 + 0.465), 0, 1)";
  start 0s;
  duration 30s;
};
animate blade0c.opacity {
  expression "clamp(0.5 + 7 * sin(t * 1.0472 + 0.7749), 0, 1)";
  start 0s;
  duration 30s;
};
animate blade0d.opacity {
  expression "clamp(0.5 + 7 * sin(t * 3.14159 + 3.4872), 0, 1)";
  start 0s;
  duration 30s;
};
animate blade0e.opacity {
  expression "clamp(0.5 + 7 * sin(t * 2.0944 + 3.0997), 0, 1)";
  start 0s;
  duration 30s;
};
animate blade0f.opacity {
  expression "clamp(0.5 + 7 * sin(t * 1.25664 + 2.3248), 0, 1)";
  start 0s;
  duration 30s;
};
animate blade0g.opacity {
  expression "clamp(0.5 + 7 * sin(t * 2.0944 + 4.6496), 0, 1)";
  start 0s;
  duration 30s;
};
animate car0a.position.x {
  expression "150 - 163 * clamp((((t + 2.05) % 15) - 0) * 0.4474, 0, 1) + 384 * clamp((((t + 2.05) % 15) - 2.235) * 0.1899, 0, 1) + 163 * clamp((((t + 2.05) % 15) - 7.5) * 0.4474, 0, 1) - 384 * clamp((((t + 2.05) % 15) - 9.735) * 0.1899, 0, 1)";
  start 0s;
  duration 30s;
};
animate car0a.position.y {
  expression "-35 + 81.5 * clamp((((t + 2.05) % 15) - 0) * 0.4474, 0, 1) + 192 * clamp((((t + 2.05) % 15) - 2.235) * 0.1899, 0, 1) - 81.5 * clamp((((t + 2.05) % 15) - 7.5) * 0.4474, 0, 1) - 192 * clamp((((t + 2.05) % 15) - 9.735) * 0.1899, 0, 1)";
  start 0s;
  duration 30s;
};
animate car0a.scale.x {
  expression "-1 + 2 * clamp((((t + 2.05) % 15) - 2.075) * 3.125, 0, 1) - 2 * clamp((((t + 2.05) % 15) - 7.34) * 3.125, 0, 1) + 2 * clamp((((t + 2.05) % 15) - 9.575) * 3.125, 0, 1) - 2 * clamp((((t + 2.05) % 15) - 9.895) * 0.1959, 0, 1)";
  start 0s;
  duration 30s;
};
animate car0a.opacity {
  expression "1 - 1 * clamp((((t + 2.05) % 15) - 9.735) * 100, 0, 1) + 1 * clamp((((t + 2.05) % 15) - 14.99) * 100, 0, 1)";
  start 0s;
  duration 30s;
};
animate car0b.position.x {
  expression "556 - 163 * clamp((((t + 3) % 15) - 0) * 0.508, 0, 1) + 458 * clamp((((t + 3) % 15) - 1.969) * 0.1808, 0, 1) + 163 * clamp((((t + 3) % 15) - 7.5) * 0.508, 0, 1) - 458 * clamp((((t + 3) % 15) - 9.469) * 0.1808, 0, 1)";
  start 0s;
  duration 30s;
};
animate car0b.position.y {
  expression "168 + 81.5 * clamp((((t + 3) % 15) - 0) * 0.508, 0, 1) + 229 * clamp((((t + 3) % 15) - 1.969) * 0.1808, 0, 1) - 81.5 * clamp((((t + 3) % 15) - 7.5) * 0.508, 0, 1) - 229 * clamp((((t + 3) % 15) - 9.469) * 0.1808, 0, 1)";
  start 0s;
  duration 30s;
};
animate car0b.scale.x {
  expression "-1 + 2 * clamp((((t + 3) % 15) - 1.809) * 3.125, 0, 1) - 2 * clamp((((t + 3) % 15) - 7.34) * 3.125, 0, 1) + 2 * clamp((((t + 3) % 15) - 9.309) * 3.125, 0, 1) - 2 * clamp((((t + 3) % 15) - 9.629) * 0.1862, 0, 1)";
  start 0s;
  duration 30s;
};
animate car0b.opacity {
  expression "1 - 1 * clamp((((t + 3) % 15) - 9.469) * 100, 0, 1) + 1 * clamp((((t + 3) % 15) - 14.99) * 100, 0, 1)";
  start 0s;
  duration 30s;
};
animate van0Back.position.x {
  expression "122 - 46 * clamp(((t % 30) - 0) * 0.2273, 0, 1) - 61 * clamp(((t % 30) - 4.4) * 1.1111, 0, 1) + 140 * clamp(((t % 30) - 5.3) * 0.5882, 0, 1) * (2 - clamp(((t % 30) - 5.3) * 0.5882, 0, 1)) + 255 * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) + 133 * clamp(((t % 30) - 21.8) * 0.8333, 0, 1) - 395 * clamp(((t % 30) - 23) * 0.25, 0, 1) - 26 * clamp(((t % 30) - 27) * 0.3333, 0, 1)";
  start 0s;
  duration 30s;
};
animate van0Back.position.y {
  expression "-25 + 23 * clamp(((t % 30) - 0) * 0.2273, 0, 1) + 30.5 * clamp(((t % 30) - 4.4) * 1.1111, 0, 1) + 70 * clamp(((t % 30) - 5.3) * 0.5882, 0, 1) * (2 - clamp(((t % 30) - 5.3) * 0.5882, 0, 1)) + 127.5 * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) - 66.5 * clamp(((t % 30) - 21.8) * 0.8333, 0, 1) - 197.5 * clamp(((t % 30) - 23) * 0.25, 0, 1) + 13 * clamp(((t % 30) - 27) * 0.3333, 0, 1)";
  start 0s;
  duration 30s;
};
animate van0Back.opacity {
  expression "1 - 1 * clamp(((t % 30) - 23) * 100, 0, 1) + 1 * clamp(((t % 30) - 26.99) * 100, 0, 1)";
  start 0s;
  duration 30s;
};
animate van0Back.scale.x {
  expression "-1 + 2 * clamp(((t % 30) - 5.1) * 2.5, 0, 1) - 2 * clamp(((t % 30) - 21.6) * 2.5, 0, 1) + 2 * clamp(((t % 30) - 22.8) * 2.5, 0, 1) - 2 * clamp(((t % 30) - 26.8) * 2.5, 0, 1)";
  start 0s;
  duration 30s;
};
animate van0Back.cab.opacity {
  expression "1 - 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) + 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate van0Back.cabFront.opacity {
  expression "1 - 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) + 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate van0Back.cabBack.opacity {
  expression "0 + 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) - 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate van0.position.x {
  expression "122 - 46 * clamp(((t % 30) - 0) * 0.2273, 0, 1) - 61 * clamp(((t % 30) - 4.4) * 1.1111, 0, 1) + 140 * clamp(((t % 30) - 5.3) * 0.5882, 0, 1) * (2 - clamp(((t % 30) - 5.3) * 0.5882, 0, 1)) + 255 * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) + 133 * clamp(((t % 30) - 21.8) * 0.8333, 0, 1) - 395 * clamp(((t % 30) - 23) * 0.25, 0, 1) - 26 * clamp(((t % 30) - 27) * 0.3333, 0, 1)";
  start 0s;
  duration 30s;
};
animate van0.position.y {
  expression "-25 + 23 * clamp(((t % 30) - 0) * 0.2273, 0, 1) + 30.5 * clamp(((t % 30) - 4.4) * 1.1111, 0, 1) + 70 * clamp(((t % 30) - 5.3) * 0.5882, 0, 1) * (2 - clamp(((t % 30) - 5.3) * 0.5882, 0, 1)) + 127.5 * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) - 66.5 * clamp(((t % 30) - 21.8) * 0.8333, 0, 1) - 197.5 * clamp(((t % 30) - 23) * 0.25, 0, 1) + 13 * clamp(((t % 30) - 27) * 0.3333, 0, 1)";
  start 0s;
  duration 30s;
};
animate van0.opacity {
  expression "1 - 1 * clamp(((t % 30) - 23) * 100, 0, 1) + 1 * clamp(((t % 30) - 26.99) * 100, 0, 1)";
  start 0s;
  duration 30s;
};
animate van0.scale.x {
  expression "-1 + 2 * clamp(((t % 30) - 5.1) * 2.5, 0, 1) - 2 * clamp(((t % 30) - 21.6) * 2.5, 0, 1) + 2 * clamp(((t % 30) - 22.8) * 2.5, 0, 1) - 2 * clamp(((t % 30) - 26.8) * 2.5, 0, 1)";
  start 0s;
  duration 30s;
};
animate van0.cab.opacity {
  expression "1 - 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) + 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate van0.cabFront.opacity {
  expression "1 - 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) + 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate van0.cabBack.opacity {
  expression "0 + 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) - 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedA0.position.x {
  expression "-9.21 - 10.79 * clamp(((t % 30) - 0) * 1.25, 0, 1) + 87 * clamp(((t % 30) - 0.8) * 0.2632, 0, 1) + 178 * clamp(((t % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp(((t % 30) - 13.8) * 0.2632, 0, 1) - 167.21 * clamp(((t % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedA0.position.y {
  expression "89.39 - 5.39 * clamp(((t % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp(((t % 30) - 0.8) * 0.2632, 0, 1) + 89 * clamp(((t % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp(((t % 30) - 13.8) * 0.2632, 0, 1) - 83.61 * clamp(((t % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedA0.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 0)) * (1 - 1 * clamp(((t % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp(((t % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedB0.position.x {
  expression "-5.21 - 10.79 * clamp((((t + 29.45) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 29.45) % 30) - 0.8) * 0.2632, 0, 1) + 178 * clamp((((t + 29.45) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 29.45) % 30) - 13.8) * 0.2632, 0, 1) - 167.21 * clamp((((t + 29.45) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedB0.position.y {
  expression "94.39 - 5.39 * clamp((((t + 29.45) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 29.45) % 30) - 0.8) * 0.2632, 0, 1) + 89 * clamp((((t + 29.45) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 29.45) % 30) - 13.8) * 0.2632, 0, 1) - 83.61 * clamp((((t + 29.45) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedB0.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 91.3)) * (1 - 1 * clamp((((t + 29.45) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 29.45) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedC0.position.x {
  expression "-9.21 - 10.79 * clamp((((t + 29.24) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 29.24) % 30) - 0.8) * 0.2632, 0, 1) + 178 * clamp((((t + 29.24) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 29.24) % 30) - 13.8) * 0.2632, 0, 1) - 167.21 * clamp((((t + 29.24) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedC0.position.y {
  expression "89.39 - 5.39 * clamp((((t + 29.24) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 29.24) % 30) - 0.8) * 0.2632, 0, 1) + 89 * clamp((((t + 29.24) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 29.24) % 30) - 13.8) * 0.2632, 0, 1) - 83.61 * clamp((((t + 29.24) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedC0.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 90.65)) * (1 - 1 * clamp((((t + 29.24) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 29.24) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedD0.position.x {
  expression "-10.21 - 10.79 * clamp((((t + 29.698) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 29.698) % 30) - 0.8) * 0.2632, 0, 1) + 178 * clamp((((t + 29.698) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 29.698) % 30) - 13.8) * 0.2632, 0, 1) - 167.21 * clamp((((t + 29.698) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedD0.position.y {
  expression "85.89 - 5.39 * clamp((((t + 29.698) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 29.698) % 30) - 0.8) * 0.2632, 0, 1) + 89 * clamp((((t + 29.698) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 29.698) % 30) - 13.8) * 0.2632, 0, 1) - 83.61 * clamp((((t + 29.698) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedD0.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 92.06)) * (1 - 1 * clamp((((t + 29.698) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 29.698) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedE0.position.x {
  expression "391.27 - 11.27 * clamp((((t + 7) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 7) % 30) - 0.8) * 0.2632, 0, 1) + 186 * clamp((((t + 7) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 7) % 30) - 13.8) * 0.2632, 0, 1) - 174.73 * clamp((((t + 7) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedE0.position.y {
  expression "289.64 - 5.64 * clamp((((t + 7) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 7) % 30) - 0.8) * 0.2632, 0, 1) + 93 * clamp((((t + 7) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 7) % 30) - 13.8) * 0.2632, 0, 1) - 87.36 * clamp((((t + 7) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedE0.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 21.7)) * (1 - 1 * clamp((((t + 7) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 7) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedF0.position.x {
  expression "395.27 - 11.27 * clamp((((t + 6.45) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 6.45) % 30) - 0.8) * 0.2632, 0, 1) + 186 * clamp((((t + 6.45) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 6.45) % 30) - 13.8) * 0.2632, 0, 1) - 174.73 * clamp((((t + 6.45) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedF0.position.y {
  expression "294.64 - 5.64 * clamp((((t + 6.45) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 6.45) % 30) - 0.8) * 0.2632, 0, 1) + 93 * clamp((((t + 6.45) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 6.45) % 30) - 13.8) * 0.2632, 0, 1) - 87.36 * clamp((((t + 6.45) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedF0.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 20)) * (1 - 1 * clamp((((t + 6.45) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 6.45) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate bike0.position.x {
  expression "-948 + ((t * 58.66667 + 880) % 2640)";
  start 0s;
  duration 30s;
};
animate bike0.position.y {
  expression "-406 + 0.5 * ((t * 58.66667 + 880) % 2640)";
  start 0s;
  duration 30s;
};
animate bike0.rider.legs.rotation {
  expression "0.35 * sin(t * 9.42478)";
  start 0s;
  duration 30s;
};
animate gardenA0.arm.rotation {
  expression "0 - 0.85 * clamp(((t % 10) - 1.6) * 1.6667, 0, 1) * clamp(((t % 10) - 1.6) * 1.6667, 0, 1) * (3 - 2 * clamp(((t % 10) - 1.6) * 1.6667, 0, 1)) + 0.85 * clamp(((t % 10) - 3.2) * 1.6667, 0, 1) * clamp(((t % 10) - 3.2) * 1.6667, 0, 1) * (3 - 2 * clamp(((t % 10) - 3.2) * 1.6667, 0, 1))";
  start 0s;
  duration 30s;
};
animate gardenA0.arm.water.opacity {
  expression "0 + 1 * clamp(((t % 10) - 2.1) * 5, 0, 1) - 1 * clamp(((t % 10) - 3.15) * 5, 0, 1)";
  start 0s;
  duration 30s;
};
animate gardenB0.position.x {
  expression "296 + 16 * clamp(((t % 15) - 2.5) * 0.5263, 0, 1) - 16 * clamp(((t % 15) - 7.4) * 0.5, 0, 1)";
  start 0s;
  duration 30s;
};
animate gardenB0.position.y {
  expression "63 + 8 * clamp(((t % 15) - 2.5) * 0.5263, 0, 1) - 8 * clamp(((t % 15) - 7.4) * 0.5, 0, 1)";
  start 0s;
  duration 30s;
};
animate laundry0.scale.y {
  expression "1 - 0.08 * sin(t * 4.18879) * sin(t * 4.18879)";
  start 0s;
  duration 30s;
};
animate laundry0.position.x {
  expression "542 + 0.6 * sin(t * 2.0944)";
  start 0s;
  duration 30s;
};
animate shrubs0.scale.x {
  expression "1 + 0.035 * sin(t * 2.51327)";
  start 0s;
  duration 30s;
};
animate cafe1Sign.face.lit.opacity {
  expression "clamp(0.5 + 7 * sin(t * 3.14159 + 1.5708), 0, 1)";
  start 0s;
  duration 30s;
};
animate cafe1Sign.face.glow.opacity {
  expression "clamp(0.5 - 7 * sin(t * 3.14159 + 1.5708), 0, 1)";
  start 0s;
  duration 30s;
};
animate blade1b.opacity {
  expression "clamp(0.5 + 7 * sin(t * 1.25664 + 0.465), 0, 1)";
  start 0s;
  duration 30s;
};
animate blade1c.opacity {
  expression "clamp(0.5 + 7 * sin(t * 1.0472 + 0.7749), 0, 1)";
  start 0s;
  duration 30s;
};
animate blade1d.opacity {
  expression "clamp(0.5 + 7 * sin(t * 3.14159 + 3.4872), 0, 1)";
  start 0s;
  duration 30s;
};
animate blade1e.opacity {
  expression "clamp(0.5 + 7 * sin(t * 2.0944 + 3.0997), 0, 1)";
  start 0s;
  duration 30s;
};
animate blade1f.opacity {
  expression "clamp(0.5 + 7 * sin(t * 1.25664 + 2.3248), 0, 1)";
  start 0s;
  duration 30s;
};
animate blade1g.opacity {
  expression "clamp(0.5 + 7 * sin(t * 2.0944 + 4.6496), 0, 1)";
  start 0s;
  duration 30s;
};
animate car1a.position.x {
  expression "1030 - 163 * clamp((((t + 2.05) % 15) - 0) * 0.4474, 0, 1) + 384 * clamp((((t + 2.05) % 15) - 2.235) * 0.1899, 0, 1) + 163 * clamp((((t + 2.05) % 15) - 7.5) * 0.4474, 0, 1) - 384 * clamp((((t + 2.05) % 15) - 9.735) * 0.1899, 0, 1)";
  start 0s;
  duration 30s;
};
animate car1a.position.y {
  expression "405 + 81.5 * clamp((((t + 2.05) % 15) - 0) * 0.4474, 0, 1) + 192 * clamp((((t + 2.05) % 15) - 2.235) * 0.1899, 0, 1) - 81.5 * clamp((((t + 2.05) % 15) - 7.5) * 0.4474, 0, 1) - 192 * clamp((((t + 2.05) % 15) - 9.735) * 0.1899, 0, 1)";
  start 0s;
  duration 30s;
};
animate car1a.scale.x {
  expression "-1 + 2 * clamp((((t + 2.05) % 15) - 2.075) * 3.125, 0, 1) - 2 * clamp((((t + 2.05) % 15) - 7.34) * 3.125, 0, 1) + 2 * clamp((((t + 2.05) % 15) - 9.575) * 3.125, 0, 1) - 2 * clamp((((t + 2.05) % 15) - 9.895) * 0.1959, 0, 1)";
  start 0s;
  duration 30s;
};
animate car1a.opacity {
  expression "1 - 1 * clamp((((t + 2.05) % 15) - 9.735) * 100, 0, 1) + 1 * clamp((((t + 2.05) % 15) - 14.99) * 100, 0, 1)";
  start 0s;
  duration 30s;
};
animate car1b.position.x {
  expression "1436 - 163 * clamp((((t + 3) % 15) - 0) * 0.508, 0, 1) + 458 * clamp((((t + 3) % 15) - 1.969) * 0.1808, 0, 1) + 163 * clamp((((t + 3) % 15) - 7.5) * 0.508, 0, 1) - 458 * clamp((((t + 3) % 15) - 9.469) * 0.1808, 0, 1)";
  start 0s;
  duration 30s;
};
animate car1b.position.y {
  expression "608 + 81.5 * clamp((((t + 3) % 15) - 0) * 0.508, 0, 1) + 229 * clamp((((t + 3) % 15) - 1.969) * 0.1808, 0, 1) - 81.5 * clamp((((t + 3) % 15) - 7.5) * 0.508, 0, 1) - 229 * clamp((((t + 3) % 15) - 9.469) * 0.1808, 0, 1)";
  start 0s;
  duration 30s;
};
animate car1b.scale.x {
  expression "-1 + 2 * clamp((((t + 3) % 15) - 1.809) * 3.125, 0, 1) - 2 * clamp((((t + 3) % 15) - 7.34) * 3.125, 0, 1) + 2 * clamp((((t + 3) % 15) - 9.309) * 3.125, 0, 1) - 2 * clamp((((t + 3) % 15) - 9.629) * 0.1862, 0, 1)";
  start 0s;
  duration 30s;
};
animate car1b.opacity {
  expression "1 - 1 * clamp((((t + 3) % 15) - 9.469) * 100, 0, 1) + 1 * clamp((((t + 3) % 15) - 14.99) * 100, 0, 1)";
  start 0s;
  duration 30s;
};
animate van1Back.position.x {
  expression "1002 - 46 * clamp(((t % 30) - 0) * 0.2273, 0, 1) - 61 * clamp(((t % 30) - 4.4) * 1.1111, 0, 1) + 140 * clamp(((t % 30) - 5.3) * 0.5882, 0, 1) * (2 - clamp(((t % 30) - 5.3) * 0.5882, 0, 1)) + 255 * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) + 133 * clamp(((t % 30) - 21.8) * 0.8333, 0, 1) - 395 * clamp(((t % 30) - 23) * 0.25, 0, 1) - 26 * clamp(((t % 30) - 27) * 0.3333, 0, 1)";
  start 0s;
  duration 30s;
};
animate van1Back.position.y {
  expression "415 + 23 * clamp(((t % 30) - 0) * 0.2273, 0, 1) + 30.5 * clamp(((t % 30) - 4.4) * 1.1111, 0, 1) + 70 * clamp(((t % 30) - 5.3) * 0.5882, 0, 1) * (2 - clamp(((t % 30) - 5.3) * 0.5882, 0, 1)) + 127.5 * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) - 66.5 * clamp(((t % 30) - 21.8) * 0.8333, 0, 1) - 197.5 * clamp(((t % 30) - 23) * 0.25, 0, 1) + 13 * clamp(((t % 30) - 27) * 0.3333, 0, 1)";
  start 0s;
  duration 30s;
};
animate van1Back.opacity {
  expression "1 - 1 * clamp(((t % 30) - 23) * 100, 0, 1) + 1 * clamp(((t % 30) - 26.99) * 100, 0, 1)";
  start 0s;
  duration 30s;
};
animate van1Back.scale.x {
  expression "-1 + 2 * clamp(((t % 30) - 5.1) * 2.5, 0, 1) - 2 * clamp(((t % 30) - 21.6) * 2.5, 0, 1) + 2 * clamp(((t % 30) - 22.8) * 2.5, 0, 1) - 2 * clamp(((t % 30) - 26.8) * 2.5, 0, 1)";
  start 0s;
  duration 30s;
};
animate van1Back.cab.opacity {
  expression "1 - 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) + 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate van1Back.cabFront.opacity {
  expression "1 - 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) + 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate van1Back.cabBack.opacity {
  expression "0 + 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) - 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate van1.position.x {
  expression "1002 - 46 * clamp(((t % 30) - 0) * 0.2273, 0, 1) - 61 * clamp(((t % 30) - 4.4) * 1.1111, 0, 1) + 140 * clamp(((t % 30) - 5.3) * 0.5882, 0, 1) * (2 - clamp(((t % 30) - 5.3) * 0.5882, 0, 1)) + 255 * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) + 133 * clamp(((t % 30) - 21.8) * 0.8333, 0, 1) - 395 * clamp(((t % 30) - 23) * 0.25, 0, 1) - 26 * clamp(((t % 30) - 27) * 0.3333, 0, 1)";
  start 0s;
  duration 30s;
};
animate van1.position.y {
  expression "415 + 23 * clamp(((t % 30) - 0) * 0.2273, 0, 1) + 30.5 * clamp(((t % 30) - 4.4) * 1.1111, 0, 1) + 70 * clamp(((t % 30) - 5.3) * 0.5882, 0, 1) * (2 - clamp(((t % 30) - 5.3) * 0.5882, 0, 1)) + 127.5 * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) - 66.5 * clamp(((t % 30) - 21.8) * 0.8333, 0, 1) - 197.5 * clamp(((t % 30) - 23) * 0.25, 0, 1) + 13 * clamp(((t % 30) - 27) * 0.3333, 0, 1)";
  start 0s;
  duration 30s;
};
animate van1.opacity {
  expression "1 - 1 * clamp(((t % 30) - 23) * 100, 0, 1) + 1 * clamp(((t % 30) - 26.99) * 100, 0, 1)";
  start 0s;
  duration 30s;
};
animate van1.scale.x {
  expression "-1 + 2 * clamp(((t % 30) - 5.1) * 2.5, 0, 1) - 2 * clamp(((t % 30) - 21.6) * 2.5, 0, 1) + 2 * clamp(((t % 30) - 22.8) * 2.5, 0, 1) - 2 * clamp(((t % 30) - 26.8) * 2.5, 0, 1)";
  start 0s;
  duration 30s;
};
animate van1.cab.opacity {
  expression "1 - 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) + 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate van1.cabFront.opacity {
  expression "1 - 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) + 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate van1.cabBack.opacity {
  expression "0 + 1 * clamp(((t % 30) - 21.75) * 10, 0, 1) - 1 * clamp(((t % 30) - 29.95) * 20, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedA1.position.x {
  expression "870.79 - 10.79 * clamp(((t % 30) - 0) * 1.25, 0, 1) + 87 * clamp(((t % 30) - 0.8) * 0.2632, 0, 1) + 178 * clamp(((t % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp(((t % 30) - 13.8) * 0.2632, 0, 1) - 167.21 * clamp(((t % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedA1.position.y {
  expression "529.39 - 5.39 * clamp(((t % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp(((t % 30) - 0.8) * 0.2632, 0, 1) + 89 * clamp(((t % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp(((t % 30) - 13.8) * 0.2632, 0, 1) - 83.61 * clamp(((t % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedA1.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 0)) * (1 - 1 * clamp(((t % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp(((t % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedB1.position.x {
  expression "874.79 - 10.79 * clamp((((t + 29.45) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 29.45) % 30) - 0.8) * 0.2632, 0, 1) + 178 * clamp((((t + 29.45) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 29.45) % 30) - 13.8) * 0.2632, 0, 1) - 167.21 * clamp((((t + 29.45) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedB1.position.y {
  expression "534.39 - 5.39 * clamp((((t + 29.45) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 29.45) % 30) - 0.8) * 0.2632, 0, 1) + 89 * clamp((((t + 29.45) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 29.45) % 30) - 13.8) * 0.2632, 0, 1) - 83.61 * clamp((((t + 29.45) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedB1.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 91.3)) * (1 - 1 * clamp((((t + 29.45) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 29.45) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedC1.position.x {
  expression "870.79 - 10.79 * clamp((((t + 29.24) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 29.24) % 30) - 0.8) * 0.2632, 0, 1) + 178 * clamp((((t + 29.24) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 29.24) % 30) - 13.8) * 0.2632, 0, 1) - 167.21 * clamp((((t + 29.24) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedC1.position.y {
  expression "529.39 - 5.39 * clamp((((t + 29.24) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 29.24) % 30) - 0.8) * 0.2632, 0, 1) + 89 * clamp((((t + 29.24) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 29.24) % 30) - 13.8) * 0.2632, 0, 1) - 83.61 * clamp((((t + 29.24) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedC1.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 90.65)) * (1 - 1 * clamp((((t + 29.24) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 29.24) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedD1.position.x {
  expression "869.79 - 10.79 * clamp((((t + 29.698) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 29.698) % 30) - 0.8) * 0.2632, 0, 1) + 178 * clamp((((t + 29.698) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 29.698) % 30) - 13.8) * 0.2632, 0, 1) - 167.21 * clamp((((t + 29.698) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedD1.position.y {
  expression "525.89 - 5.39 * clamp((((t + 29.698) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 29.698) % 30) - 0.8) * 0.2632, 0, 1) + 89 * clamp((((t + 29.698) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 29.698) % 30) - 13.8) * 0.2632, 0, 1) - 83.61 * clamp((((t + 29.698) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedD1.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 92.06)) * (1 - 1 * clamp((((t + 29.698) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 29.698) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedE1.position.x {
  expression "1271.27 - 11.27 * clamp((((t + 7) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 7) % 30) - 0.8) * 0.2632, 0, 1) + 186 * clamp((((t + 7) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 7) % 30) - 13.8) * 0.2632, 0, 1) - 174.73 * clamp((((t + 7) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedE1.position.y {
  expression "729.64 - 5.64 * clamp((((t + 7) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 7) % 30) - 0.8) * 0.2632, 0, 1) + 93 * clamp((((t + 7) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 7) % 30) - 13.8) * 0.2632, 0, 1) - 87.36 * clamp((((t + 7) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedE1.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 21.7)) * (1 - 1 * clamp((((t + 7) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 7) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate pedF1.position.x {
  expression "1275.27 - 11.27 * clamp((((t + 6.45) % 30) - 0) * 1.25, 0, 1) + 87 * clamp((((t + 6.45) % 30) - 0.8) * 0.2632, 0, 1) + 186 * clamp((((t + 6.45) % 30) - 4.6) * 0.125, 0, 1) - 87 * clamp((((t + 6.45) % 30) - 13.8) * 0.2632, 0, 1) - 174.73 * clamp((((t + 6.45) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedF1.position.y {
  expression "734.64 - 5.64 * clamp((((t + 6.45) % 30) - 0) * 1.25, 0, 1) - 43.5 * clamp((((t + 6.45) % 30) - 0.8) * 0.2632, 0, 1) + 93 * clamp((((t + 6.45) % 30) - 4.6) * 0.125, 0, 1) + 43.5 * clamp((((t + 6.45) % 30) - 13.8) * 0.2632, 0, 1) - 87.36 * clamp((((t + 6.45) % 30) - 17.6) * 0.0806, 0, 1)";
  start 0s;
  duration 30s;
};
animate pedF1.legs.scale.x {
  expression "1 - 0.72 * abs(sin(t * 6.28319 + 20)) * (1 - 1 * clamp((((t + 6.45) % 30) - 12.6) * 5.5556, 0, 1) + 1 * clamp((((t + 6.45) % 30) - 13.62) * 5.5556, 0, 1))";
  start 0s;
  duration 30s;
};
animate bike1.position.x {
  expression "-948 + ((t * 58.66667 + 1760) % 2640)";
  start 0s;
  duration 30s;
};
animate bike1.position.y {
  expression "-406 + 0.5 * ((t * 58.66667 + 1760) % 2640)";
  start 0s;
  duration 30s;
};
animate bike1.rider.legs.rotation {
  expression "0.35 * sin(t * 9.42478)";
  start 0s;
  duration 30s;
};
animate gardenA1.arm.rotation {
  expression "0 - 0.85 * clamp(((t % 10) - 1.6) * 1.6667, 0, 1) * clamp(((t % 10) - 1.6) * 1.6667, 0, 1) * (3 - 2 * clamp(((t % 10) - 1.6) * 1.6667, 0, 1)) + 0.85 * clamp(((t % 10) - 3.2) * 1.6667, 0, 1) * clamp(((t % 10) - 3.2) * 1.6667, 0, 1) * (3 - 2 * clamp(((t % 10) - 3.2) * 1.6667, 0, 1))";
  start 0s;
  duration 30s;
};
animate gardenA1.arm.water.opacity {
  expression "0 + 1 * clamp(((t % 10) - 2.1) * 5, 0, 1) - 1 * clamp(((t % 10) - 3.15) * 5, 0, 1)";
  start 0s;
  duration 30s;
};
animate gardenB1.position.x {
  expression "1176 + 16 * clamp(((t % 15) - 2.5) * 0.5263, 0, 1) - 16 * clamp(((t % 15) - 7.4) * 0.5, 0, 1)";
  start 0s;
  duration 30s;
};
animate gardenB1.position.y {
  expression "503 + 8 * clamp(((t % 15) - 2.5) * 0.5263, 0, 1) - 8 * clamp(((t % 15) - 7.4) * 0.5, 0, 1)";
  start 0s;
  duration 30s;
};
animate laundry1.scale.y {
  expression "1 - 0.08 * sin(t * 4.18879) * sin(t * 4.18879)";
  start 0s;
  duration 30s;
};
animate laundry1.position.x {
  expression "1422 + 0.6 * sin(t * 2.0944)";
  start 0s;
  duration 30s;
};
animate shrubs1.scale.x {
  expression "1 + 0.035 * sin(t * 2.51327)";
  start 0s;
  duration 30s;
};
step vanm1.visible { at 5150ms; value true; };
step vanm1.visible { at 21960ms; value false; };
step vanm1Back.visible { at 5150ms; value false; };
step vanm1Back.visible { at 21960ms; value true; };
step van0.visible { at 5150ms; value true; };
step van0.visible { at 21960ms; value false; };
step van0Back.visible { at 5150ms; value false; };
step van0Back.visible { at 21960ms; value true; };
step van1.visible { at 5150ms; value true; };
step van1.visible { at 21960ms; value false; };
step van1Back.visible { at 5150ms; value false; };
step van1Back.visible { at 21960ms; value true; };
complete;

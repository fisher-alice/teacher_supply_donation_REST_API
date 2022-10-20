# teacher_supply_donation_REST_API

This application was completed as a final project in the Oregon State University CS 493 course – Cloud Application Development. 

This application models a teacher, her students, and the supplies that she needs at the beginning of the school year. The TEACHER is the user, and the two non-user entities are STUDENT and SUPPLY.
The reason I am modeling this scenario is that teachers on average spend about $1000 from their personal funds to pay for classroom supplies. I would like to implement an application so that teachers can more easily manage the donation of supplies from her students. 

A teacher has a list of supplies needed that will be used for all her students. The teacher also has students. Each student can donate at most one supply. However, there may be a need for more than one item of a particular supply. For example, a teacher may need 20 tissue boxes. Therefore, a supply will have the attributes num_needed (number of items requested), num_supplied (number already donated by students) and students (the array of student_ids of students who donated the supply). 

Within the application, a student or supply cannot be created without being related to a teacher.
The unique identifier used to relate the student and supply to the teacher is the teacher’s auth0 number named teacher_autho. This teacher_autho is shared among all 3 entities and is provided by the JWT token of the user (teacher).

View the data model and API specification [doc](https://github.com/fisher-alice/teacher_supply_donation_REST_API/blob/main/Data%20model%20and%20API%20specification.pdf) for more detailed information.

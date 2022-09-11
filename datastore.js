const {Datastore} = require('@google-cloud/datastore');
const { get } = require('request');
const datastore = new Datastore();
const TEACHER = "Teacher";
const STUDENT = "Student";
const SUPPLY = "Supply";

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}
function editTeacher(target_teacher){
    var edited_teacher = {};
    edited_teacher.teacher_autho = target_teacher.teacher_autho;
    edited_teacher.students = target_teacher.students;
    edited_teacher.email = target_teacher.email;
    edited_teacher.supplies_needed = target_teacher.supplies_needed;
    edited_teacher.name = target_teacher.name;
    return edited_teacher;
}

function get_teacher_autho(teacher_autho){
    console.log("inside get_teacher_autho - teacher_autho=" + teacher_autho);
    return module.exports.get_teachers()
    .then((teachers) => {
        for(var i=0; i<teachers.length; i++){
            if(teachers[i].teacher_autho === teacher_autho){
                console.log("found teacher " + teachers[i]);
                return teachers[i];
            }
        }
        return null;
    })
}

module.exports = {
    post_teacher: function post_teacher(teacher_autho, name, email){
        var key = datastore.key(TEACHER);
        const new_teacher = {"teacher_autho": teacher_autho, "name": name, "email": email, "supplies_needed": [], "students": []};
        return datastore.save({"key":key, "data":new_teacher})
        .then(() => {
            return datastore.get(key)
            .then((entity) => {
                return fromDatastore(entity[0]);
            });
        })
    },

    // display teachers 
    get_teachers: function get_teachers(){
        console.log("inside get_all_teachers");
        var q = datastore.createQuery(TEACHER);
        return datastore.runQuery(q)
        .then( (entities) => {
            return entities[0].map(fromDatastore);             
        });
    },

    get_teacher: function get_teacher(teacher_id){
        console.log("inside get_teacher - teacher_id=" + teacher_id);
        const key = datastore.key([TEACHER, parseInt(teacher_id, 10)]);
        return datastore.get(key).then((entity) => {
            if (entity[0] === undefined || entity[0] === null) {
                return null;
            } else {
                var teacher = fromDatastore(entity[0]);
                return teacher;
            }
        });
    },

    delete_teacher_test: function delete_teacher_test(teacher_id){
        console.log("inside delete_teacher id=" + teacher_id);
        const key = datastore.key([TEACHER, parseInt(teacher_id,10)]);
        return datastore.delete(key);
    },
    post_supply: function post_supply(teacher_autho, description, num_needed){
        var supply_ret;
        console.log("inside function post_supply");
        // check if user with teacher_autho has an account 
        return get_teacher_autho(teacher_autho)
        .then ((target_teacher) => {   
            if(target_teacher == null){
                return null;
            }     
            var key = datastore.key(SUPPLY);
            const new_supply = {"teacher_autho": teacher_autho, "description": description, "num_needed": num_needed, "num_supplied": 0, "students": []};
            return datastore.save({ "key": key, "data": new_supply })
                .then(() => { return datastore.get(key)
                    .then((supply) => {
                    supply = fromDatastore(supply[0]);
                    supply_ret = supply;
                    // add supply to teacher's collection of supplies
                    target_teacher.supplies_needed.push({supply_id: supply.id});
                    const teacher_id = target_teacher.id;
                    const edited_teacher = editTeacher(target_teacher);
                    const teacher_key = datastore.key([TEACHER, parseInt(teacher_id,10)]);
                    datastore.save({"key": teacher_key, "data": edited_teacher})
                })
                .then(() => {
                        console.log("supply after save teacher " + supply_ret);
                        return supply_ret;
                });
            });  
        });
    },

    update_supply: function update_supply(id, teacher_autho, description, num_needed, num_supplied, students){
        const key = datastore.key([SUPPLY, parseInt(id, 10)]);
        const supply = { "teacher_autho": teacher_autho, "description": description,"num_needed":num_needed, "num_supplied":num_supplied, "students": students};
        return datastore.save({ "key": key, "data": supply  })
        .then(() => { return datastore.get(key)
            .then((entity) => {
                return fromDatastore(entity[0]); 
            });
        })       
    },
    get_supplies: function get_supplies(req, teacher_autho){
        console.log("inside get_supplies()");
        var q = datastore.createQuery(SUPPLY).filter('teacher_autho', '=', teacher_autho).limit(5);
        var results = {};
        if(Object.keys(req.query).includes("cursor")){
            q = q.start(req.query.cursor);
        }    
        return datastore.runQuery(q)
        .then( (entities) => {
            results.supplies = entities[0];//.map(fromDatastore); // array of supplies     
            if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "/supplies?cursor=" + entities[1].endCursor;
            }
            results.supplies.map(fromDatastore);
            
            var q_total = datastore.createQuery(SUPPLY).filter('teacher_autho', '=', teacher_autho);
            return datastore.runQuery(q_total)
            .then((entities2) => {
                results.total = entities2[0].length;
                return results;
            });
        });
    },
    delete_supply: function delete_supply(supply_id){
        console.log("inside delete_supply id=" + supply_id);
        return module.exports.get_supply(supply_id)
        .then((supply) => {
            const key = datastore.key([SUPPLY, parseInt(supply_id,10)]);
            // delete supply from teacher
            const teacher_autho = supply.teacher_autho;
            return get_teacher_autho(teacher_autho)
            .then((target_teacher) => {
                    var supplies = target_teacher.supplies_needed;
                    var index = -1;
                    for(var i=0; i<supplies.length; i++){
                        if(supplies[i].supply_id === supply_id){
                            index = i;
                        }
                    }
                    supplies.splice(index,1);
                    const teacher_id = target_teacher.id;
                    const edited_teacher = editTeacher(target_teacher);
                    const teacher_key = datastore.key([TEACHER, parseInt(teacher_id,10)]);
                    datastore.save({"key": teacher_key, "data": edited_teacher})
                    return datastore.delete(key);
            });      
        });
    },

    get_supply: function get_supply(supply_id){
        console.log("inside get_supply - supply_id=" + supply_id);
        const key = datastore.key([SUPPLY, parseInt(supply_id, 10)]);
        return datastore.get(key).then((entity) => {
            if (entity[0] === undefined || entity[0] === null) {
                return null;
            } else {
                var supply = fromDatastore(entity[0]);
                console.log(supply);
                return supply;
            }
        });
    },

    post_student: function post_student(teacher_autho, first_name, last_name, class_period){
        var student_ret;
        console.log("inside function post_student");
        // check if user with teacher_autho has an account 
        return get_teacher_autho(teacher_autho)
        .then((target_teacher) => {   
            if(target_teacher == null){
                return null;
            }   
            var key = datastore.key(STUDENT);
            const new_student = {"teacher_autho": teacher_autho, "first_name": first_name, "last_name": last_name, "class_period": class_period, "supply_donated": null };
            return datastore.save({ "key": key, "data": new_student })
            .then(() => { 
                return datastore.get(key)
                .then((student) => {
                    student = fromDatastore(student[0]);
                    student_ret = student;
                    // add student to teacher's collection of students
                    target_teacher.students.push({student_id: student.id});
                    const teacher_id = target_teacher.id;
                    const edited_teacher = editTeacher(target_teacher);
                    const teacher_key = datastore.key([TEACHER, parseInt(teacher_id,10)]);
                    datastore.save({"key": teacher_key, "data": edited_teacher})
                })
                .then(() => {
                    console.log("student after save teacher " + student_ret);
                    return student_ret;
                });
            });
        });
    },
    update_student: function update_student(id, teacher_autho, first_name, last_name, class_period, supply){
        console.log("before key "  + id);
        const key = datastore.key([STUDENT, parseInt(id, 10)]);
        const student = { "teacher_autho": teacher_autho, "first_name": first_name,"last_name":last_name, "class_period":class_period, "supply_donated": supply};
        return datastore.save({ "key": key, "data": student  })
        .then(() => { return datastore.get(key)
            .then((entity) => {
                return fromDatastore(entity[0]); 
            });
        })       
    },    
    delete_student: function delete_student(student_id){
        console.log("inside delete_student id=" + student_id);
        return module.exports.get_student(student_id)
        .then((student) => {
            const key = datastore.key([STUDENT, parseInt(student_id,10)]);
            // delete supply from teacher
            const teacher_autho = student.teacher_autho;
            return get_teacher_autho(teacher_autho)
            .then((target_teacher) => {
                var students = target_teacher.students;
                var index = -1;
                for(var i=0; i<students.length; i++){
                    if(students[i].student_id === student_id){
                        index = i;
                    }
                }
                students.splice(index,1);
                const teacher_id = target_teacher.id;
                const edited_teacher = editTeacher(target_teacher);
                const teacher_key = datastore.key([TEACHER, parseInt(teacher_id,10)]);
                datastore.save({"key": teacher_key, "data": edited_teacher})
                return datastore.delete(key);
            });      
        });
    },
    get_student: function get_student(student_id){
        console.log("inside get_student - student_id=" + student_id);
        const key = datastore.key([STUDENT, parseInt(student_id, 10)]);
        return datastore.get(key).then((entity) => {
            if (entity[0] === undefined || entity[0] === null) {
                return null;
            } else {
                var student = fromDatastore(entity[0]);
                console.log(student);
                return student;
            }
        });
    },
    get_students: function get_students(req, teacher_autho){
        console.log("inside get_students");
        console.log(teacher_autho);
        var q = datastore.createQuery(STUDENT).filter('teacher_autho', '=', teacher_autho).limit(5);

        var results = {};
        if(Object.keys(req.query).includes("cursor")){
            q = q.start(req.query.cursor);
        }    
        return datastore.runQuery(q)
        .then( (entities) => {
            console.log("entitities " + entities);
            results.students = entities[0];     
            if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "/students?cursor=" + entities[1].endCursor;
            }
            results.students.map(fromDatastore);
            
            var q_total = datastore.createQuery(STUDENT).filter('teacher_autho', '=', teacher_autho)
            return datastore.runQuery(q_total)
            .then((entities2) => {
                results.total = entities2[0].length;
                return results;
            });
        });
    },
    assign_supply_to_student: function assign_supply_to_student(supply_id, student_id){
        return module.exports.get_student(student_id)
        .then( (student) => {
            const key = datastore.key([STUDENT, parseInt(student_id,10)]);
            const supply_donated = {"supply_id": supply_id}; 
            student.supply_donated = supply_donated; 
            return datastore.save({"key":key, "data":student});
        });       
    },
    add_student_to_supply: function add_student_to_supply(student_id, supply_id){
        return module.exports.get_supply(supply_id)
        .then( (supply) => {
            const key = datastore.key([SUPPLY, parseInt(supply_id,10)]);
            const student = {"student_id": student_id}; 
            supply.students.push(student);
            supply.num_supplied = supply.num_supplied + 1;
            return datastore.save({"key":key, "data":supply});
        });  
    },
    delete_supply_from_student: function delete_supply_from_student(student_id){
        console.log("inside delete_supply_from_student ");
        return module.exports.get_student(student_id)
        .then( (student) => {  
                      
            student.supply_donated = null; 
            const key = datastore.key([STUDENT, parseInt(student_id,10)]);
            return datastore.save({"key":key, "data": student});
        });
    },

    delete_student_from_supply: function delete_student_from_supply(student_id, supply_id){
        console.log("inside delete_student_from_supply ");
        return module.exports.get_supply(supply_id)
        .then( (supply) => {
            var student_to_delete_index = -1;
            for(var i=0; supply != null && i<supply.students.length; i++){
                if(supply.students[i].student_id === student_id){
                    student_to_delete_index = i;
                    console.log("student_to_delete_index " + i);
                }
            }
            supply.students.splice(student_to_delete_index,1);
            supply.num_supplied = supply.num_supplied - 1;
            console.log("supply.num_supplied " + supply.num_supplied);
            const key = datastore.key([SUPPLY, parseInt(supply_id,10)]);
            return datastore.save({"key":key, "data":supply});
        });
    },
    delete_supply_from_all_students: function delete_supply_from_all_students(students){
        for(var i=0; i<students.length; i++){
            // remove supply from students because supply will be updated completely and num_supplied set to 0
            var student_id = students[i].student_id;
            console.log("inside for loop student_id " + student_id);
            module.exports.delete_supply_from_student(student_id);
        }
    }

}
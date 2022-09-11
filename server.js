const express = require('express');
const axios = require('axios');
const app = express();
const path = require('path');
const { auth } = require('express-openid-connect');
const CLIENT_ID = '9vbmzQO72cwMBoA8a2Mnz6XrBIQvLU4F';
const DOMAIN = 'https://cs493-spring-2022.us.auth0.com'; 
const my_secret = 'rEPrAEJjJYaSaYwEmvFM0k4CkW2Cw5_F_HPXpH4sv7UMlZUU6_C8PqL209neaT03';
const URL= 'https://final-project-fisheali.uc.r.appspot.com';
const config = {
    authRequired: false,
    auth0Logout: true,
    //baseURL: 'http://localhost:8080',
    baseURL: URL,
    clientID: CLIENT_ID,
    issuerBaseURL: DOMAIN,
    secret: my_secret
};
app.use(auth(config));
app.use(express.json());
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
const json2html = require('json-to-html');
var handlebars = require('express-handlebars').create({defaultLayout:'main'});
app.engine('handlebars', handlebars.engine);

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));
//Create static file references
app.use('/static', express.static('public')); //middleware
app.use(express.static(path.join(__dirname, 'public')));
const bodyParser = require('body-parser');
app.use(bodyParser.json());

const ds = require('./datastore'); 
const {post_teacher, get_teachers, delete_teacher_test, get_teacher, 
       post_supply, delete_supply, get_supply, get_supplies, update_supply,
       post_student, delete_student, get_student, get_students, update_student,
       assign_supply_to_student, add_student_to_supply,
       delete_supply_from_student, delete_student_from_supply, delete_supply_from_all_students } = require('./datastore');
       
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const { ppid } = require('process');
const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${DOMAIN}/.well-known/jwks.json`
    }),
    // Validate the audience and the issuer.
    credentialsRequired: true,
    issuer: `${DOMAIN}/`,
    algorithms: ['RS256']
});


/* ------------- Begin Controller Functions ------------- */
app.get('/', (req, res) => {
    if(req.oidc.isAuthenticated()){       
        var data = {};
        var teacher_email = req.oidc.user.email;
        var teacher_name = req.oidc.user.nickname;
        var autho = req.oidc.user.sub;
        data.profile = "USER NAME: " + teacher_name;
        data.id = "USER ID: " + autho;
        data.jwt = "JWT: " + req.oidc.idToken;
        data.title = "USER PROFILE";
        data.msg = "Thanks for visiting this website!"
        // POST /users to create teacher account
        var teachers_url = URL + '/teachers';
        const body_parameters = {
            name: teacher_name,
            email: teacher_email,
            teacher_autho: autho
        };
        axios.post(
            teachers_url, body_parameters
        )
        .then((response) => {
            console.log(response);
            res.render('home', data);
        }).catch(console.log);     
    }
    else{
        data = {};
        data.profile = "";
        data.id = "";
        data.jwt = "";
        data.title = "WELCOME";
        data.msg = "This website allows you to create or log into a teacher account and receive a JWT for authorization."
        res.render('home', data);
    }
});

app.post('/teachers', function(req, res){        
    post_teacher(req.body.teacher_autho, req.body.name, req.body.email)
    .then( teacher => {
        //res.location(req.protocol + "://" + req.get('host') + req.baseUrl + '/' + key.id);
        res.status(201).json(teacher);
    });
});

/*
Return 200 and array of all teachers
*/
app.get('/teachers',function(req, res){
    get_teachers()
    .then( (teachers) => {
        res.status(200).json(teachers);
    });
});

app.get('/teachers/:teacher_id',function(req, res){
    get_teacher(req.params.teacher_id)
    .then( (teacher) => {
        if(teacher===null){
            res.status(404).json({"Error": "No teacher with this teacher_id exists"});
        }
        else{
            teacher["self"] = req.protocol + "://" + req.get('host') + req.baseUrl + '/teachers/' + teacher.id;
            console.log(teacher.self);
            res.status(200).json(teacher);
        }

    });
});

//for testing only
app.delete('/teachers/:teacher_id', function(req, res){
    console.log(req.params.teacher_id);
    get_teacher(req.params.teacher_id)
    .then(teacher => {
        if (teacher === undefined || teacher === null) {
            // The 0th element is undefined. This means there is no teacher with this id
            console.log("teacher undefined or null");
            res.status(404).json({ 'Error': 'No teacher with this teacher_id exists' });
        }  
        else
        {
            delete_teacher_test(req.params.teacher_id).then(res.status(204).end());
        }
    });  
});

app.put('/teachers', function (req, res){
    res.set('Accept', 'POST');
    res.status(405).json({'Error': 'Route only accepts GET or POST methods'});
});

app.post('/supplies', checkJwt, function(req, res){
    console.log("inside post /supplies");
    var num_needed = req.body.num_needed;
    var description = req.body.description;
    console.log(num_needed + " " + description);
    const accepts = req.accepts(['application/json', 'text/html']);
    if(!accepts){
        res.status(406).send({'Error': 'Not Acceptable'});
    }
    else if(description===undefined || num_needed===undefined || !Number.isInteger(num_needed) || num_needed<0){
        res.status(400).json({ "Error": "The request object is missing at least one of the required attributes or the data provided is invalid." });
    }
    else{
        console.log("inside app.post /supplies - req.user.sub=" + req.user.sub);
         post_supply(req.user.sub, description, num_needed)
        .then( (new_supply) => {     
      
            if(new_supply === null){
                res.status(400).json({ "Error": "This user does not yet have a teacher account." });
            }    
            else{
                console.log("new_supply " + new_supply);
                //new_supply["self"] = req.protocol + "://" + req.get('host') + req.baseUrl + '/supplies/' + new_supply.id;
                //console.log(new_supply.self);
                res.status(201).json(new_supply);
            }
        });
    } 
});
app.put('/supplies/:supply_id', checkJwt, function(req, res){    
    console.log("inside put supplies/supplie_id");  
    const supply_id = req.params.supply_id;
    get_supply(supply_id)
    .then((supply) => {
        if (supply === undefined || supply === null) {
            res.status(404).json({ 'Error': 'No supply with this supply_id exists' });
        }
        else if(req.user.sub != supply.teacher_autho){
            // not authorized
            res.status(403).json({ 'Error': 'Unauthorized' });
        }       
        else{
            // remove supply from all students
            delete_supply_from_all_students(supply.students);
            // new description, new num_needed, and no students yet donating supply
            const new_description = req.body.description;
            const new_num_needed = req.body.num_needed;
            var has_description = new_description!==null && new_description!==undefined;
            var has_num_needed = new_num_needed!==null && new_num_needed!==undefined;
            if(!has_description || !has_num_needed )
            {
                res.status(400).json({ "Error": "The request object is missing at least one of the required attributes" });
            }          
            else{     
                update_supply(supply_id, supply.teacher_autho, new_description, new_num_needed, 0, [])
                .then ((supply) =>{
                    const url = req.protocol + "://" + req.get("host") + req.baseUrl + "/" + supply.id;                    
                    supply["self"] = req.protocol + "://" + req.get("host") + req.baseUrl + "/" + supply.id;
                    //console.log(boat.self);
                    res.location(supply["self"]);
                    res.status(200).json(supply) ;                                  
                });                                       
            }
        }
    });     
});

app.patch('/supplies/:supply_id', checkJwt, function(req, res){      
    const supply_id = req.params.supply_id;
    get_supply(supply_id)
    .then(supply => {
        if (supply === undefined || supply === null) {
            res.status(404).json({ 'Error': 'No supply with this supply_id exists' });
        }
        else if(req.user.sub != supply.teacher_autho){
            res.status(403).json({ 'Error': 'Unauthorized' });
        }
        else{
            // constraint that description can only be revised to modify spelling or phrasing but not actual supply item
            const new_description = req.body.description;
            const new_num_needed = req.body.num_needed;  // can only be updated so that >= num_supplied
            if(new_num_needed < req.body.num_supplied){
                res.status(404).json({ 'Error': 'The request object is invalid - revised num_needed must be < num_suppied' });
            }
            else{

                var has_description = new_description!==null && new_description!==undefined;
                var has_num_needed = new_num_needed!==null && new_num_needed!==undefined;
                if(has_description){
                    supply.description = new_description;                
                }  
                if(has_num_needed){
                    supply.num_needed = new_num_needed;
                }
                update_supply(supply_id, supply.teacher_autho, supply.description, supply.num_needed, supply.num_supplied, supply.students)
                .then ((supply) =>{
                    const url = req.protocol + "://" + req.get("host") + req.baseUrl + "/" + supply.id;                    
                    supply["self"] = req.protocol + "://" + req.get("host") + req.baseUrl + "/" + supply.id;
                    //console.log(boat.self);
                    res.location(supply["self"]);
                    res.status(200).json(supply) ;                                  
                });   
            }
        }
    });     
});

// will only return a list of supplies related to user
app.get('/supplies',checkJwt, function(req, res){
    get_supplies(req, req.user.sub)
    .then( (supplies) => {
        res.status(200).json(supplies);
    });
});

app.get('/supplies/:supply_id',checkJwt, function(req, res){
    get_supply(req.params.supply_id)
    .then( (supply) => {
        if(supply===null){
            res.status(404).json({"Error": "No supply with this supply_id exists"});
        }
        else if(supply.teacher_autho != req.user.sub){
            res.status(403).json({ 'Error': 'Unauthorized' });
        }
        else{
            supply["self"] = req.protocol + "://" + req.get('host') + req.baseUrl + '/supplies/' + supply.id;
            console.log(supply.self);
            res.status(200).json(supply);
        }

    });
});

app.delete('/supplies/:supply_id', checkJwt, function(req, res){
    console.log(req.params.supply_id);
    return get_supply(req.params.supply_id)
    .then(supply => {
        if (supply === undefined || supply === null) {
            // The 0th element is undefined. This means there is no supply with this id
            console.log("supply undefined or null");
            res.status(404).json({ 'Error': 'No supply with this supply_id exists' });
        }
        else if(supply.teacher_autho != req.user.sub){
            res.status(403).json({ 'Error': 'Unauthorized' });
        }  
        else
        {
            console.log("inside delete else");
            delete_supply_from_all_students(supply.students);
            delete_supply(req.params.supply_id);
            res.status(204).end();
        }
    });  
});

app.post('/students', checkJwt, function(req, res){
    console.log("inside post /students");
    var first_name = req.body.first_name;
    var last_name = req.body.last_name;
    var class_period = req.body.class_period;
    if(first_name===undefined || last_name===undefined || !Number.isInteger(class_period) || class_period<0){
        res.status(400).json({ "Error": "The request object is missing at least one of the required attributes or the data provided is invalid." });
    }
    else{
        console.log("inside app.post /students - req.user.sub=" + req.user.sub);
         post_student(req.user.sub, first_name, last_name, class_period)
        .then( (new_student) => {     
      
            if(new_student === null){
                res.status(400).json({ "Error": "This user does not yet have a teacher account." });
            }    
            else{
                console.log("new_student " + new_student);
                //new_supply["self"] = req.protocol + "://" + req.get('host') + req.baseUrl + '/supplies/' + new_supply.id;
                //console.log(new_supply.self);
                res.status(201).json(new_student);
            }
        });
    } 
});

// will only return a list of students related to user
app.get('/students',checkJwt, function(req, res){
    get_students(req, req.user.sub)
    .then( (students) => {
        res.status(200).json(students);
    });
}); 

app.get('/students/:student_id',checkJwt, function(req, res){
    get_student(req.params.student_id)
    .then( (student) => {
        if(student===null){
            res.status(404).json({"Error": "No student with this student_id exists"});
        }
        else if(student.teacher_autho != req.user.sub){
            res.status(403).json({ 'Error': 'Unauthorized' });
        }
        else{
            student["self"] = req.protocol + "://" + req.get('host') + req.baseUrl + '/students/' + student.id;
            console.log(student.self);
            res.status(200).json(student);
        }

    });
});
app.put('/students/:student_id', checkJwt, function(req, res){      
    const student_id = req.params.student_id;
    get_student(student_id)
    .then((student) => {
        if (student === undefined || student === null) {
            res.status(404).json({ 'Error': 'No student with this student_id exists' });
        }
        else if(req.user.sub != student.teacher_autho){
            // not authorized
            res.status(403).json({ 'Error': 'Unauthorized' });
        }       
        else{
            // remove student from supply
            if(student.supply_donated != null){
                delete_student_from_supply(student_id, student.supply_donated.supply_id);
            }


            const new_first_name = req.body.first_name;
            const new_last_name = req.body.last_name;
            const new_class_period = req.body.class_period;
            var has_first_name = new_first_name!==null && new_first_name!==undefined;
            var has_last_name = new_last_name!==null && new_last_name!==undefined;
            var has_class_period = new_class_period!==null && new_class_period!==undefined;            
            if(!has_first_name || !has_last_name || !has_class_period )
            {
                res.status(400).json({ "Error": "The request object is missing at least one of the required attributes" });
            }          
            else{     
                console.log("student_id " + student_id);
                update_student(student_id, student.teacher_autho, new_first_name, new_last_name, new_class_period,null)
                .then ((student) =>{
                    const url = req.protocol + "://" + req.get("host") + req.baseUrl + "/" + student.id;                    
                    student["self"] = req.protocol + "://" + req.get("host") + req.baseUrl + "/" + student.id;
                    res.location(student["self"]);
                    res.status(200).json(student) ;                                  
                });                                       
            }
        }
    });     
});

app.patch('/students/:student_id', checkJwt, function(req, res){      
    const student_id = req.params.student_id;
    get_student(student_id)
    .then((student) => {
        if (student === undefined || student === null) {
            res.status(404).json({ 'Error': 'No student with this student_id exists' });
        }
        else if(req.user.sub != student.teacher_autho){
            // not authorized
            res.status(403).json({ 'Error': 'Unauthorized' });
        }       
        else{
            const new_first_name = req.body.first_name;
            const new_last_name = req.body.last_name;
            const new_class_period = req.body.class_period;
            var has_first_name = new_first_name!==null && new_first_name!==undefined;
            var has_last_name = new_last_name!==null && new_last_name!==undefined;
            var has_class_period = new_class_period!==null && new_class_period!==undefined;
            if(has_first_name){
                student.first_name = new_first_name;
            }
            if(has_last_name){
                student.last_name = new_last_name;
            }
            if(has_class_period){
                student.class_period = new_class_period;
            }
            update_student(student_id, student.teacher_autho, student.first_name, student.last_name, student.class_period,student.supply_donated)
            .then ((student) =>{
                const url = req.protocol + "://" + req.get("host") + req.baseUrl + "/" + student.id;                    
                student["self"] = req.protocol + "://" + req.get("host") + req.baseUrl + "/" + student.id;
                res.location(student["self"]);
                res.status(200).json(student) ;                                  
            }); 
        }
    });
});

app.delete('/students/:student_id', checkJwt, function(req, res){
    console.log(req.params.student_id);
    const student_id = req.params.student_id;
    return get_student(req.params.student_id)
    .then(student => {
        if (student === undefined || student === null) {
            // The 0th element is undefined. This means there is no student with this id
            console.log("student undefined or null");
            res.status(404).json({ 'Error': 'No student with this student_id exists' });
        }  
        else if(student.teacher_autho != req.user.sub){
            res.status(403).json({ 'Error': 'Unauthorized' });
        }
        else
        {
            if(student.supply_donated !=null){
                supply_id = student.supply_donated.supply_id;
                delete_supply_from_student(supply_id, student_id);
            }
            
            delete_student(req.params.student_id);
            res.status(204).end();
        }
    });  
});


app.put('/supplies/:supply_id/students/:student_id', checkJwt, function (req, res) {  
    const supply_id = req.params.supply_id;
    const student_id = req.params.student_id;
    get_supply(supply_id)
    .then((supply) => {
        if (supply === undefined || supply === null) {
            res.status(404).json({ "Error": "The specified supply and/or student does not exist" });
        } else {
            get_student(student_id)
            .then((student) => {
                if (student === undefined || student === null) {
                    res.status(404).json({ "Error": "The specified supply and/or student does not exist"});                
                }
                else{
                // supply and student exist - now check student already has a supply
                    if(student.supply_donated != null){
                        // if not null - supply cannot be added
                        res.status(403).json({ "Error": "The student already has a donated supply" });   
                    }
                    else if(supply.num_needed === supply.num_supplied){
                        // if supply not needed - student cannot donate
                        res.status(403).json({ "Error": "This supply is no longer needed" });                          
                    }
                    else{
                        // add student to supply
                        assign_supply_to_student(supply_id, student_id)
                        .then(() => add_student_to_supply(student_id, supply_id))
                        .then(() => res.status(204).end())        
                    }                
                }
            })
        }
    });       
});

// remove supply from student and student from supply
app.delete('/supplies/:supply_id/students/:student_id', checkJwt, function (req, res) {  
    const supply_id = req.params.supply_id;
    const student_id = req.params.student_id;
    get_supply(supply_id)
    .then( (supply) => {
        if (supply === undefined || supply === null) {
            res.status(404).json({ "Error": "The specified supply and/or student does not exist" });
        } else {
            get_student(student_id)
            .then((student) => {
                if (student === undefined || student === null) {
                    res.status(404).json({"Error": "The specified supply and/or student does not exist"});                
                }
                else{
                    // check if student has supply
                    if(student.supply_donated === null || student.supply_donated.supply_id !== supply_id){
                        res.status(404).json({ "Error": "This student with this student_id does not have this supply with this supply_id" });   
                    }
                    else{ // remove supply from student and student from supply    
                        delete_supply_from_student(student_id)
                        .then(() => delete_student_from_supply(student_id, supply_id))
                        .then(() => res.status(204).end())   
                    }                                
                }
            })
        }
    });       
});

app.use(function(err, req, res, next){

    if (err.name === "UnauthorizedError") {
        console.error(err.name);
        console.log(JSON.stringify(err));
        console.log("Source: " + req.originalUrl);
        res.status(401).send({"Error": "Missing or invalid JWT token."});
    } else {
        next();
    }
});



/* ------------- End Controller Functions ------------- */


// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});


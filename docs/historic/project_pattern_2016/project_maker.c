#include <stdio.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>
#include <stdlib.h>
#include <time.h>

#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>

#define MIN 10
#define MAX 256
#define MAXMAX 1024
#define SUPERMAX 4096

//https://docs.npmjs.com/getting-started/using-a-package.json -> UTIL

typedef struct _Project{
	
	char name[MAX];				/**/
	char tags[MAX];				/**/
	char version[MAX];			/**/
	char description[MAXMAX];	/**/
	char entry_point[MAX];		/**/
	char test_command[MAX];		/**/
	char git_repository[MAXMAX];/**/
	char keywords[MAXMAX];		/**/
	char author[MAX];			/**/
	char license[MAX];			/**/
	char date_creation[MAX];	/**/
	char status[MIN];			/**/

}Project;

void default_project_name(const char * cwd, char * dft_name){
	int i, j, s = strlen(cwd), last_slash = 0;
	for(i = 0; i < s; i++){
		if(cwd[i] == '/')
			last_slash = i;
	}

	for(i = last_slash + 1, j = 0; i < s; i++, j++){
		dft_name[j] = cwd[i];
	}
	dft_name[j] = '\0';
}

void build_from_package_file();

void show_licenses();

void help();

void show_project(Project prj){
	printf("name: %s\n", prj.name);
	printf("created at:\n%s\n\n", prj.date_creation);
	printf("version: %s\n", prj.version);
	printf("description: %s\n", prj.description);
	printf("entry_point: %s\n", prj.entry_point);
	printf("test_command: %s\n", prj.test_command);
	printf("git_repository: %s\n", prj.git_repository);
	printf("keywords: %s\n", prj.keywords);
	printf("author: %s\n", prj.author);
	printf("license: %s\n", prj.license);
	printf("status: %s\n", prj.status);
}

int print_project(Project prj, int create_folder, const char *path){
	FILE *fp;

	char localpath[SUPERMAX];

	strcpy(localpath, "");

	if(create_folder){
		strcat(localpath, path);
		strcat(localpath, "/");
	}
	strcat(localpath, "README.md");

	fp = fopen(localpath, "w+");

	if(fp == NULL)
		return 0;

	// Capitalize first letter of Project name
	prj.name[0] -= 32;
	fprintf(fp, "#%s\n\n", prj.name);
	fprintf(fp, "### Created at:\n%s\n\n", prj.date_creation);
	fprintf(fp, "### Version:\n%s\n\n", prj.version);
	fprintf(fp, "# Description:\n%s\n\n", prj.description);
	fprintf(fp, "## Entry Point:\n%s\n\n", prj.entry_point);
	fprintf(fp, "## Test Command:\n%s\n\n", prj.test_command);

	fprintf(fp, "### Keywords:\n%s\n\n", prj.keywords);

	fprintf(fp, "### Author(s):\n%s\n\n", prj.author);
	fprintf(fp, "### License:\n%s\n\n", prj.license);
	fprintf(fp, "### Status:\n%s\n\n", prj.status);

	return 1;
}

int scan_string(int expected_size, char * str){
	int i = 0;
	char c;

	do{

		scanf("%c", &c);
		if(c == '\n')
			break;
		str[i++] = c;

	}while(i <= expected_size);

	return i;
}

void upper_string(const char * s, char * str) {
   int i = 0;
 
	while (s[i] != '\0') {
		if (s[i] >= 'a' && s[i] <= 'z') {
			str[i] = s[i] - 32;
		}
		else{
			str[i] = s[i];
		}
		i++;
	}
	str[i] = '\0';
}

int main(int argc, char *argv[]){

	Project prj;

	char buffer[MAXMAX];

	int create_folder = 0;

	if(argc >= 2){
		if(!strcmp(argv[1], "-f")){
			create_folder = 1;
		}
		else{
			printf("Wrong parameter entered\n-f:\tCreate a folder and put readme file in it.");
			return -1;
		}

	}

	char cwd[1024];
	if (getcwd(cwd, sizeof(cwd)) != NULL){
		//fprintf(stdout, "Current working dir: %s\n", cwd);
		default_project_name(cwd, buffer);
	}
	else{
		perror("getcwd() error");
	}

	time_t rawtime;
	struct tm * timeinfo;

	time ( &rawtime );
	timeinfo = localtime ( &rawtime );

	//printf ( "Current local time and date: %s\n", asctime (timeinfo) );

    sprintf(prj.date_creation, "[%d %d %d %d:%d:%d]\n",timeinfo->tm_mday, timeinfo->tm_mon + 1, timeinfo->tm_year + 1900, timeinfo->tm_hour, timeinfo->tm_min, timeinfo->tm_sec);

    char upr_name[MAX];

	printf("At any time you can type ^C to exit\
			\nIf you don't understand how to fill a field type 'h' or 'help' for help and examples\n");

	int err = 0;

	/* Name:
	 * all lowercase
	 * one word, no spaces
	 * dashes and underscores allowed
	 */
	do{
		printf("name: (%s) ", buffer);
		int size = scan_string(MAX, prj.name);
		int i;
		for(i = 0; i < size; i++){
			if(prj.name[i] != '-' && prj.name[i] != '_' && (!(prj.name[i] >= 'a' || prj.name[i] <= 'z'))){
				err = 1;
				break;
			}
		}
		if(size == 0){
			err = 1;
		}

		if(err){
			printf("Invalid name, please retry\n");
			err = 0;
		}
	}while(err);


	upper_string(prj.name, upr_name);

	do{
		printf("version: (1.0.0) ");
		int size = scan_string(MAX, prj.version);
		int i;
		for(i = 0; i < size; i++){
			if(prj.version[i] != '.' && (prj.version[i] < '0' || prj.version[i] > '9')){
				err = 1;
				break;
			}
		}
		if(err){
			printf("Invalid version, please retry\n");
			err = 0;
		}
	}while(err);

	printf("description: ");
	scan_string(MAXMAX, prj.description);

	printf("entry point: (index.js) ");
	scan_string(MAX, prj.entry_point);

	printf("test command: (node index.js) ");
	scan_string(MAX, prj.test_command);

	printf("git repository: (__) ");
	scan_string(MAX, prj.git_repository);

	printf("keywords: (comma separated) ");
	scan_string(MAXMAX, prj.keywords);

	printf("author: ");
	scan_string(MAX, prj.author);

	printf("license: (ISC) ");
	scan_string(MAX, prj.license);

	printf("status: ");
	scan_string(MAX, prj.status);

	if(create_folder)
		printf("About to write to %s/%s/README.md: \n", cwd, upr_name);
	else
		printf("About to write to %s/README.md: \n", cwd);

	printf("%s\n", prj.status);

	show_project(prj);

	printf("Is this ok? (yes)");

	scan_string(MAX, buffer);

	int resp;

	if(buffer[0] == 'Y' || buffer[0] == 'y'){
		if(create_folder){

			struct stat st = {0};

			if (stat(upr_name, &st) == -1) {
			    mkdir(upr_name, 0700);
			}

		}
		resp = print_project(prj, create_folder, upr_name);
		if(resp){
			printf("README.md file was created sucessfully to project: %s.\n", prj.name);
		}
		else{
			printf("Something went wrong.\n");	
		}
	}
	else{
		printf("Aborted.\n");
	}


	return 0;
}
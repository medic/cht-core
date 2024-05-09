const { $, driver } = require('@wdio/globals');
const Page = require('./page');

class ContactsPage extends Page {

  async loadContactList(settingsProvider) {
    const page = settingsProvider.getPage('contact-list');
    await super.loadAndAssertPage(page);
  }

  async loadCHWArea(settingsProvider) {
    const page = settingsProvider.getPage('chw-area');
    await super.loadAndAssertPage(page);
  }

  async loadHousehold(settingsProvider) {
    const page = settingsProvider.getPage('household');
    await super.loadAndAssertPage(page);
  }

  async loadPatient(settingsProvider) {
    const page = settingsProvider.getPage('patient');
    await super.loadAndAssertPage(page);
  }


  // ToDo: clean all these below after settings are done
   
  get btnSearch() {
    return $('//*[@text="Performance"]');
  }

  get firstHouseholdKE () {
    return $('(//android.widget.TextView[@text="visits"])[1]');
  }

  get firstHousehold () {
    return $('(//android.view.View[@text="icon-family"])[1]');
  }

  get firstVillage () {
    return $('//*[contains(@text,"Village")]');
  }

  get btnAdd () {
    return $('//android.widget.Button');
  }

  get btnAddNew () {
    return $('(//android.widget.Button)[2]');
  }

  get textNewPersonKE () {
    return $('//*[@text="Add new Person"]');
  }

  get textNewPersonNE () {
    return $('//*[@text="New person"]');
  }

  get textNewPersonUG () {
    return $('//*[@text="New Person"]');
  }

  get textNewPersonTG () {
    return $('//*[@text="Add person"]');
  }

  get inputFirstName () {
    return $('//*[@text="First name"]//parent::android.view.View/android.widget.EditText');
  }

  get inputMiddleName () {
    return $('//*[@text="Middle name"]//parent::android.view.View/android.widget.EditText');
  }

  get inputLastName () {
    return $('//*[contains(@text, "Last name")]//parent::android.view.View/android.widget.EditText');
  }

  get inputFirstNameNE () {
    return $('//*[@text="First Name"]//parent::android.view.View/android.widget.EditText');
  }

  get inputLastNameNE () {
    return $('//*[@text="Last Name"]//parent::android.view.View/android.widget.EditText');
  }

  get radioMale () {
    return $('//*[@text="Gender*"]//android.widget.RadioButton[@text="Male"]');
  }

  get radioFemale () {
    return $('//*[@text="Gender*"]//android.widget.RadioButton[@text="Female"]');
  }

  get radioInterSex () {
    return $('//*[@text="Intersex"]');
  }

  get radioDobWithCalendar () {
    return $('//*[@text="With calendar (preferred)"]');
  }

  get radioDobWithAge () {
    return $('//*[@text="Date of birth with current age"]');
  }

  get inputDOB () {
    return $('//*[contains(@text,"Date of Birth")]//parent::android.view.View/android.widget.EditText');
  }

  get radioAgeYears () {
    return $('//*[@text="Age* Age in years"]');
  }

  get radioAgeMonths () {
    return $('//*[@text="0, Months* And how many months?"]');
  }

  get radioIsKenyanYes () {
    return $('//*[contains(@text,"Kenyan?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get radioBornInKenyaYes () {
    return $('//*[contains(@text,"born in Kenya?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get inputCountyOfBirth () {
    return $('//*[contains(@text, "County of birth*")]');
  }

  get inputCountyOfResidence () {
    return $('//*[contains(@text, "County of residence*")]');
  }

  get selectCounty () {
    return $('//android.widget.CheckedTextView[@text="BUSIA"]');
  }

  get inputSubCounty () {
    return $('//*[contains(@text, "Sub county*")]');
  }

  get selectSubCounty () {
    return $('//android.widget.CheckedTextView[@text="BUTULA"]');
  }

  get inputWard () {
    return $('//*[contains(@text, "Ward*")]');
  }

  get selectWard () {
    return $('//android.widget.CheckedTextView[@text="KINGANDOLE"]');
  }

  get inputVillage () {
    return $('//*[@text="Village"]//parent::android.view.View/android.widget.EditText');
  }

  get radioHaveAPhoneNo () {
    return $('//*[contains(@text,"have a phone number?")]//android.widget.RadioButton[@text="No"]');
  }

  get radioIdentificationPassport () {
    return $('//android.widget.RadioButton[@text="Passport"]');
  }

  get inputPassportNumber () {
    return $('//*[@text="Passport"]//parent::android.view.View/android.widget.EditText');
  }

  get inputNextOfKin () {
    return $('//*[contains(@text, "next of kin")]//parent::android.view.View/android.widget.EditText');
  }

  get radioNextOfKinRelationship () {
    return $('//*[@text="Mother"]//parent::android.view.View/android.widget.RadioButton');
  }

  get inputAddress () {
    return $('//*[contains(@text, "Physical address")]//parent::android.view.View/android.widget.EditText');
  }

  get inputPrimaryMobile () {
    return $('//*[contains(@text, "primary mobile number")]//parent::android.view.View/android.widget.EditText');
  }

  get inputSecondaryMobile () {
    return $('//*[contains(@text, "secondary mobile number")]//parent::android.view.View/android.widget.EditText');
  }

  get inputEmail () {
    return $('//*[contains(@text, "Email address")]//parent::android.view.View/android.widget.EditText');
  }

  get radioRelationshipHouseHead () {
    return $('//*[contains(@text,"household head?")]//android.widget.RadioButton[@text="Sibling"]');
  }

  get radioHouseholdRelationship () {
    return $('//*[contains(@text,"Relation with house")]//android.widget.RadioButton[contains(@text,"Son or")]');
  }

  get radioDisabilityNo () {
    return $('//*[contains(@text,"known disability?")]//android.widget.RadioButton[@text="No"]');
  }

  get radioIllnessNo () {
    return $('//*[contains(@text,"chronic illness?")]//android.widget.RadioButton[@text="No"]');
  }

  get radioPregnantYes () {
    return $('//*[contains(@text,"pregnant?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get radioHasHandBookYes () {
    return $('//*[contains(@text,"MCH handbook?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get btnSubmit () {
    return $('//android.widget.Button[@text="Submit"]');
  }

  get householdPerson () {
    return $('//*[contains(@text, "years")]');
  }

  get iconBack () {
    return $('//*[@text="Back"]');
  }

  get textCHVArea () {
    return $('//*[contains(@text, "CHV")]');
  }

  get textVHTArea () {
    return $('//*[contains(@text, "VHT")]');
  }

  get textCHWSite () {
    return $('//*[contains(@text, "CHW")]');
  }

  get radioDifferentPhoneNo () {
    return $('//*[contains(@text,"phone number?")]//android.widget.RadioButton[@text="No"]');
  }

  get radioReligion () {
    return $('//*[@text="Religion*"]//android.widget.RadioButton[@text="Christian"]');
  }

  get radioMaritalStatus () {
    return $('//*[contains(@text,"Marital")]//android.widget.RadioButton[@text="Married"]');
  }

  get radioPersonDisabledNo () {
    return $('//*[contains(@text,"person disabled?")]//android.widget.RadioButton[@text="No"]');
  }

  get radioEducationLevel () {
    return $('//*[contains(@text,"education completed")]//android.widget.RadioButton[@text="Basic education"]');
  }

  get radioOccupation () {
    return $('//*[contains(@text,"Occupation")]//android.widget.RadioButton[@text="Business"]');
  }

  get radioCasteCode () {
    return $('//*[contains(@text,"Caste code")]//android.widget.RadioButton[@text="Brahmin"]');
  }

  get imagePerson () {
    return $('//android.view.View[@text="icon-person"]');
  }

  get iconPregnancy () {
    return $('//*[@text="Pregnancy registration"]');
  }

  get btnNext () {
    return $('//android.widget.Button[@text="Next >"]');
  }

  get btnPrev () {
    return $('//android.widget.Button[@text="< Prev"]');
  }

  get inputLmpDate () {
    return $('//*[contains(@text,"date of the LMP")]//parent::android.view.View/android.widget.EditText');
  }

  get inputAncNumber () {
    return $('//*[contains(@text,"How many times ")]//parent::android.view.View/android.widget.EditText');
  }

  get radioFirstPregnancyYes () {
    return $('//*[contains(@text,"first pregnancy?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get radioMiscarriagesNo () {
    return $('//*[contains(@text,"any miscarriages")]//android.widget.RadioButton[@text="No"]');
  }

  get checkBoxChronicNone () {
    return $('//*[contains(@text,"chronic diseases?")]//android.widget.CheckBox[@text="None"]');
  }

  get radioVaginalBleeding () {
    return $('//*[contains(@text,"Vaginal bleeding")]//android.widget.RadioButton[@text="No"]');
  }

  get radioFits () {
    return $('//*[contains(@text,"Fits")]//android.widget.RadioButton[@text="No"]');
  }

  get radioAbdominalPain () {
    return $('//*[contains(@text,"abdominal pain")]//android.widget.RadioButton[@text="No"]');
  }

  get radioHeadache () {
    return $('//*[contains(@text,"Severe headache")]//android.widget.RadioButton[@text="No"]');
  }

  get radioPale () {
    return $('//*[contains(@text,"Very pale")]//android.widget.RadioButton[@text="No"]');
  }

  get radioFever () {
    return $('//*[contains(@text,"Fever")]//android.widget.RadioButton[@text="No"]');
  }

  get radioSwelling () {
    return $('//*[contains(@text,"Swelling of")]//android.widget.RadioButton[@text="No"]');
  }

  get radioBreathlessness () {
    return $('//*[contains(@text,"Breathlessness")]//android.widget.RadioButton[@text="No"]');
  }

  get radioHeartBeat () {
    return $('//*[contains(@text,"Heart Beat")]//android.widget.RadioButton[@text="No"]');
  }

  get radioAlbumin () {
    return $('//*[contains(@text,"Albumin in urine")]//android.widget.RadioButton[@text="Yes"]');
  }

  get iconSearch () {
    return $('//android.widget.TextView[@text=""]');
  }

  get inputSearch () {
    return $('//android.widget.EditText');
  }

  get toastPersonCreated () {
    return $('//android.widget.Toast');
  }

  get iconPregnancyKE () {
    return $('//*[@text="Pregnancy Home Visit Service"]');
  }

  get radioIsPregnantYes () {
    return $('//*[contains(@text,"pregnant?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get radioStartedAncNo () {
    return $('//*[contains(@text,"started ANC?")]//android.widget.RadioButton[@text="No"]');
  }

  get checkDangerSignsNone () {
    return $('//*[contains(@text,"danger signs")]//android.widget.CheckBox[@text="None"]');
  }

  get radioColorOfMuac () {
    return $('//*[contains(@text,"color of MUAC?")]//android.widget.RadioButton[@text="Green"]');
  }

  get radioSupplementsNo () {
    return $('//*[contains(@text,"supplements daily?")]//android.widget.RadioButton[@text="No"]');
  }

  get checkAskMentalSignsNone () {
    return $('//*[contains(@text,"Ask if")]//android.widget.CheckBox[@text="None"]');
  }

  get checkObserveMentalSignsNone () {
    return $('//*[contains(@text,"Observe if")]//android.widget.CheckBox[@text="None"]');
  }

  get radioInsuranceNo () {
    return $('//*[contains(@text,"insurance?")]//android.widget.RadioButton[@text="No"]');
  }

  get iconDefaulter () {
    return $('//*[@text="Defaulter Follow Up"]');
  }

  get radioAvailableNo () {
    return $('//*[contains(@text,"available?")]//android.widget.RadioButton[@text="No"]');
  }

  get inputFollowUpDate () {
    return $('//*[contains(@text,"like to follow up")]//parent::android.view.View/android.widget.EditText');
  }

  //num-3

  get inputNames () {
    return $('//*[contains(@text, "Names")]//parent::android.view.View/android.widget.EditText');
  }

  get radioSexFemale () {
    return $('//*[contains(@text,"Sex")]//android.widget.RadioButton[@text="Female"]');
  }

  get inputAge () {
    return $('//*[contains(@text, "Age (in years)")]//parent::android.view.View/android.widget.EditText');
  }

  get inputVHTVisit () {
    return $('//*[contains(@text, "VHT Visit")]//parent::android.view.View/android.widget.EditText');
  }

  get radioRelationshipWithHouseHead () {
    return $('//*[contains(@text,"Household Head?")]//android.widget.RadioButton[@text="Spouse"]');
  }

  get radioClientCategory () {
    return $('//*[contains(@text,"client category?")]//android.widget.RadioButton[@text="Foreigner"]');
  }

  get radioFunctionalLimitation () {
    return $('//*[contains(@text,"functional limitation?")]//android.widget.RadioButton[@text="No"]');
  }

  get radioTestedForHIV () {
    return $('//*[contains(@text,"tested for HIV")]//android.widget.RadioButton[@text="Yes"]');
  }

  get radioTestResult () {
    return $('//*[contains(@text,"HIV test?")]//android.widget.RadioButton[@text="Negative"]');
  }

  get radioHaveTB () {
    return $('//*[contains(@text,"have TB?")]//android.widget.RadioButton[@text="No"]');
  }

  get radioTTVaccine () {
    return $('//*[contains(@text,"TT vaccine?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get radioTakeAlcohol () {
    return $('//*[contains(@text,"take alcohol?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get radioHaveHypertension () {
    return $('//*[contains(@text,"have Hypertension?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get radioHaveSickleCell () {
    return $('//*[contains(@text,"Sickle Cell?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get radioUseTobacco () {
    return $('//*[contains(@text,"use Tobacco?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get radioTreatedNet () {
    return $('//*[contains(@text,"net (LLIN)?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get radioFamilyPlanning () {
    return $('//*[contains(@text,"family planning method?")]//android.widget.RadioButton[@text="No"]');
  }

  get iconPregnancyReg () {
    return $('//*[@text="Pregnancy Registration"]');
  }

  get radioReportPregnancy () {
    return $('//*[contains(@text,"pregnancy?")]//android.widget.RadioButton[@text="Last menstrual period (LMP)"]');
  }

  get inputANCVisit () {
    return $('//*[contains(@text, "?* Kindly, ")]');
  }

  get selectVisits () {
    return $('//android.widget.CheckedTextView[@text="None"]');
  }

  get radioANCVisits () {
    return $('//*[contains(@text,"upcoming ANC visits?")]//android.widget.RadioButton[@text="No"]');
  }

  get radioSevereAbdomenPain () {
    return $('//*[contains(@text,"lower abdomen")]//android.widget.RadioButton[@text="No"]');
  }

  get radioFeotalMovement () {
    return $('//*[contains(@text,"feotal movements")]//android.widget.RadioButton[@text="No"]');
  }

  get radioBlurredVision () {
    return $('//*[contains(@text,"Blurred vision")]//android.widget.RadioButton[@text="No"]');
  }

  get radioMuac () {
    return $('//*[contains(@text,"MUAC?")]//android.widget.RadioButton[@text="No"]');
  }

  get checkBoxSupplementation () {
    return $('//*[contains(@text,"Supplementation")]//android.widget.CheckBox[@text="Iron"]');
  }

  get radioNutrition () {
    return $('//*[contains(@text,"nutrition follow up?")]//android.widget.RadioButton[@text="No"]');
  }

  get radioInsecticidalNet () {
    return $('//*[contains(@text,"insecticidal net")]//android.widget.RadioButton[@text="Yes"]');
  }

  get radioTTCard () {
    return $('//*[contains(@text,"Toxoid (TD) card?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get checkBoxVaccineReceived () {
    return $('//*[contains(@text,"received?")]//android.widget.CheckBox[@text="2"]');
  }

  get imagePersonUG () {
    return $('//android.view.View[@text="medic-person"]');
  }

  //num-4

  get inputFirstNameTG () {
    return $('//*[contains(@text, "First name")]//parent::android.view.View/android.widget.EditText');
  }

  get inputNameTG () {
    return $('//*[contains(@text, "Name")]//parent::android.view.View/android.widget.EditText');
  }

  get radioSexTG () {
    return $('(//*[contains(@text,"Sex")]//android.widget.RadioButton[@text="-"])[2]');
  }

  get radioPersonType () {
    return $('(//*[contains(@text, "Type of person")]//android.widget.RadioButton[@text="-"])[2]');
  }

  get inputAgeTG () {
    return $('//*[contains(@text, "Age")]//parent::android.view.View/android.widget.EditText');
  }

  get radioEducationalLevel () {
    return $('(//*[contains(@text,"Educational level")]//android.widget.RadioButton[@text="-"])[2]');
  }

  get radioHaveATelephone () {
    return $('(//*[contains(@text,"have a telephone number?")]//android.widget.RadioButton[@text="-"])[2]');
  }

  get radioHouseholdStatus () {
    return $('(//*[contains(@text,"Status in the household")]//android.widget.RadioButton[@text="-"])[2]');
  }

  get radioOccupationTG () {
    return $('(//*[contains(@text,"Occupation")]//android.widget.RadioButton[@text="-"])[2]');
  }

  get radioIdentificationTG () {
    return $('//*[contains(@text,"How was")]//android.widget.RadioButton[@text="During the home visit"]');
  }

  get radioPregnancyConfirm () {
    return $('//*[contains(@text,"mother-baby diary")]//android.widget.RadioButton[@text="No"]');
  }

  //num-5

  get inputProfession () {
    return $('//android.view.View[contains(@text,"Profession")]');
  }

  get selectProfession () {
    return $('//android.widget.CheckedTextView[@text="Teacher"]');
  }

  get inputPhoneNumber () {
    return $('//*[contains(@text, "Phone number")]//parent::android.view.View/android.widget.EditText');
  }

  get radioMatrimonialStatus () {
    return $('//*[contains(@text,"Matrimonial Status")]//android.widget.RadioButton[@text="Single"]');
  }

  get radioRelationshipHouseHold () {
    return $('//*[contains(@text,"head of household")]//android.widget.RadioButton[@text="Cousin"]');
  }

  get btnNewAction () {
    return $('//*[contains(@text,"New action")]');
  }

  get radioRegistrationDone () {
    return $('//*[contains(@text,"Was the pregnancy")]//android.widget.RadioButton[@text="Yes"]');
  }

  get radioPregnancyConfirmed () {
    return $('//*[contains(@text,"pregnancy confirmed?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get checkBoxPregnancyConfirmed () {
    return $('//*[contains(@text,"pregnancy confirmed?")]//android.widget.CheckBox[@text="ANC card"]');
  }

  get inputWeight () {
    return $('//*[contains(@text, "the weight of")]//parent::android.view.View/android.widget.EditText');
  }

  get inputHeight () {
    return $('//*[contains(@text, "How tall is")]//parent::android.view.View/android.widget.EditText');
  }

  get radioLastPeriod () {
    return $('//*[contains(@text,"last period was?")]//android.widget.RadioButton[@text="Yes"]');
  }

  get inputLastPeriod () {
    return $('//*[contains(@text,"date of the last period?")]//parent::android.view.View/android.widget.EditText');
  }

  get radioDateOfDelivery () {
    return $('//*[contains(@text,"date of delivery?")]//android.widget.RadioButton[@text="No"]');
  }

  get inputPreviousPregnancy () {
    return $('//*[contains(@text, "successful pregnancy")]//parent::android.view.View/android.widget.EditText');
  }

  get inputPreviousAbortion () {
    return $('//*[contains(@text, "How many abortions")]//parent::android.view.View/android.widget.EditText');
  }

  get radioTDVaccine () {
    return $('//*[contains(@text,"Td1")]//android.widget.RadioButton[@text="No"]');
  }

  get radioPrenatalVisit () {
    return $('//*[contains(@text,"prenatal visit")]//android.widget.RadioButton[@text="No"]');
  }

  get inputANCVisitML () {
    return $('//*[contains(@text, "ANC visit?")]//parent::android.view.View/android.widget.EditText');
  }

  get radioRefer () {
    return $('//*[contains(@text,"Did you refer")]//android.widget.RadioButton[@text="Yes"]');
  }

  get inputSolution () {
    return $('//*[contains(@text, "SOLUTION")]//parent::android.view.View/android.widget.EditText');
  }


  async createPersonKE (firstName, lastName, dateOfBirth) {
    await super.tabPeople.waitForDisplayed();
    await super.toggleAirplaneMode('on');
    await super.tabPeople.click();
    await this.clickDisplayedElem(this.firstHouseholdKE);
    await this.householdPerson.waitForDisplayed();
    await this.btnAddNew.click();
    await this.textNewPersonKE.click();
    await this.inputFirstName.setValue(firstName);
    await this.inputMiddleName.setValue('middleName');
    await this.inputLastName.setValue(lastName);
    await this.radioFemale.click();
    
    await super.scrollView;
    await this.inputDOB.setValue(dateOfBirth);
    await this.radioIsKenyanYes.click();
    await this.radioBornInKenyaYes.click();
    await this.inputCountyOfBirth.click();
    await super.clickDisplayedElem(this.selectCounty);

    await super.scrollView;
    await this.inputCountyOfResidence.click();
    await super.clickDisplayedElem(this.selectCounty);
    await this.inputSubCounty.click();
    await super.clickDisplayedElem(this.selectSubCounty);
    await this.inputWard.click();
    await super.clickDisplayedElem(this.selectWard);
    await this.inputVillage.setValue('Village');
    await this.radioHaveAPhoneNo.click();
    await browser.pause(1000);

    await super.scrollView;
    await this.radioIdentificationPassport.click();
    await this.inputPassportNumber.waitForDisplayed();
    await this.inputPassportNumber.setValue('AB12345');
    await this.inputNextOfKin.setValue(`${lastName} next${firstName}`);
    await this.radioNextOfKinRelationship.click();
    await browser.pause(1000);

    await super.scrollView;
    await this.inputAddress.setValue('312 Glendale Mews E34T65');
    await this.inputPrimaryMobile.setValue('0775588331');
    await browser.pause(1000);

    await super.scrollView;
    await this.inputSecondaryMobile.setValue('0775588332');
    await this.inputEmail.setValue(`${firstName}@gmail.com`);
    await this.radioRelationshipHouseHead.click();

    await super.scrollView;
    await this.radioDisabilityNo.click();
    await this.radioIllnessNo.click();
    await this.radioPregnantYes.click();
    await browser.pause(1000);
    await super.scrollView;
    await this.radioHasHandBookYes.click();
    
    await browser.pause(1000);
    await super.scrollView;
    await super.clickDisplayedElem(this.btnSubmit);
    await this.imagePerson.waitForDisplayed();
    await browser.pause(5000);
  }

  async createPersonNE (firstName, lastName, dateOfBirth) {
    await super.tabPeople.waitForDisplayed();
    await super.toggleAirplaneMode('on');
    await super.tabPeople.click();
    await this.clickDisplayedElem(this.firstHousehold);
    await this.householdPerson.waitForDisplayed();
    await this.btnAddNew.click();
    await this.textNewPersonNE.click();
    await this.inputFirstNameNE.setValue(firstName);
    await this.inputLastNameNE.setValue(lastName);
    await this.inputDOB.setValue(dateOfBirth);
    
    await super.scrollView;
    await super.clickDisplayedElem(this.radioFemale);
    await this.radioDifferentPhoneNo.click();
    await this.radioReligion.click();

    await super.scrollView;
    await super.clickDisplayedElem(this.radioHouseholdRelationship);
    
    await super.scrollView;
    await super.clickDisplayedElem(this.radioMaritalStatus);
    await this.radioPersonDisabledNo.click();
    await this.radioEducationLevel.click();

    await super.scrollView;
    await this.radioOccupation.click();
    await this.radioCasteCode.click();
    await super.clickDisplayedElem(this.btnSubmit);
    await this.imagePerson.waitForDisplayed();
    await browser.pause(5000);
  }

  async createPersonUG (firstName, lastName) {
    await super.tabPeople.waitForDisplayed();
    await super.toggleAirplaneMode('on');
    await super.tabPeople.click();
    await this.clickDisplayedElem(this.firstHouseholdKE);
    await this.householdPerson.waitForDisplayed();
    await this.btnAddNew.click();
    await this.textNewPersonUG.click();
    await this.inputNames.setValue(`${firstName} ${lastName}`);
    await this.radioSexFemale.click();
    await this.inputAge.click();
    await driver.pressKeyCode(9);
    await driver.pressKeyCode(11);
    
    await super.scrollView;
    const visitDate = await super.getVHTVisitDate();
    await this.inputVHTVisit.setValue(visitDate);
    await this.radioRelationshipWithHouseHead.click();

    await super.scrollView;
    await this.radioClientCategory.click();
    await this.radioFunctionalLimitation.click();
    await this.radioTestedForHIV.click();
    await this.radioTestResult.click();
    
    await super.scrollView;
    await this.radioHaveTB.click();
    await this.radioTTVaccine.click();
    await this.radioTakeAlcohol.click();
    await this.radioHaveHypertension.click();
    await this.radioHaveSickleCell.click();

    await super.scrollView;
    await this.radioUseTobacco.click();
    await this.radioTreatedNet.click();
    await this.radioFamilyPlanning.click();
    await browser.pause(1000);
    await super.scrollView;
    await super.clickDisplayedElem(this.btnSubmit);
    await this.imagePersonUG.waitForDisplayed();
    await browser.pause(5000);
  }

  async createPersonTG (firstName, lastName) {
    await super.tabPeople.waitForDisplayed();
    await super.toggleAirplaneMode('on');
    await super.tabPeople.click();
    await this.clickDisplayedElem(this.firstHousehold);
    await this.householdPerson.waitForDisplayed();
    await this.btnAdd.click();
    await this.textNewPersonTG.click();
    await this.inputFirstNameTG.setValue(firstName);
    await this.inputNameTG.setValue(lastName);
    await this.radioSexTG.click();
    await this.radioPersonType.click();
    await this.inputAgeTG.click();
    await driver.pressKeyCode(9);
    await driver.pressKeyCode(11);
    await this.radioEducationalLevel.click();
    
    await super.scrollView;
    await this.radioHaveATelephone.click();
    await this.radioHouseholdStatus.click();
    await this.radioOccupationTG.click();
    await browser.pause(1000);
    await super.scrollView;
    await super.clickDisplayedElem(this.btnSubmit);
    await this.imagePersonUG.waitForDisplayed();
    await browser.pause(3000);
  }

  async createPersonML (firstName, lastName, dateOfBirth) {
    await super.tabPeople.waitForDisplayed();
    await super.toggleAirplaneMode('on');
    await super.tabPeople.click();
    await this.clickDisplayedElem(this.firstVillage);
    await this.householdPerson.waitForDisplayed();
    await this.textNewPersonNE.click();
    await this.inputFirstNameTG.setValue(firstName);
    await this.inputLastName.setValue(lastName);
    await this.inputAgeTG.setValue(dateOfBirth);
    
    await super.scrollView;
    await this.radioSexFemale.click();
    await this.inputProfession.click();
    await this.clickDisplayedElem(this.selectProfession);
    await this.inputPhoneNumber.click();
    await driver.pressKeyCode(8);
    await driver.pressKeyCode(8);
    await driver.pressKeyCode(8);
    await driver.pressKeyCode(8);
    await driver.pressKeyCode(8);
    await driver.pressKeyCode(8);
    await driver.pressKeyCode(8);
    await driver.pressKeyCode(8);
    await driver.hideKeyboard();
    await browser.pause(1000);
    
    await super.scrollView;
    await this.radioMatrimonialStatus.click();
    await this.radioRelationshipHouseHold.click();
    await super.clickDisplayedElem(this.btnSubmit);
    await this.imagePersonUG.waitForDisplayed();
    await browser.pause(5000);
  }

  async createReportKE () {
    await this.btnAdd.click();
    await this.iconPregnancyKE.click();
    await this.radioIsPregnantYes.click();
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.radioStartedAncNo.click();
    await this.btnNext.click();

    await this.checkDangerSignsNone.click();
    await super.scrollView;
    await this.btnPrev.waitForDisplayed();
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.radioColorOfMuac.click();
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.radioSupplementsNo.click();
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.btnNext.click();

    await this.checkAskMentalSignsNone.click();
    await super.scrollView;
    await this.btnPrev.waitForDisplayed();
    await this.checkObserveMentalSignsNone.click();
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.radioInsuranceNo.click();
    await this.btnNext.click();

    await browser.pause(2000);
    await super.scrollView;
    await this.btnPrev.waitForDisplayed();
    await super.clickDisplayedElem(this.btnSubmit);
    await this.imagePerson.waitForDisplayed();
    await this.iconBack.click();
  }

  async createReport () {
    await this.btnAdd.click();
    await this.iconPregnancy.click();
    const lmpDate = await super.getLmpDate();
    await this.inputLmpDate.waitForDisplayed();
    await this.inputLmpDate.setValue(lmpDate);
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.btnNext.click();

    await super.clickDisplayedElem(this.inputAncNumber);
    await driver.pressKeyCode(7);
    await driver.hideKeyboard();
    await browser.pause(2000);
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await browser.pause(2000);
    await this.btnNext.click();

    await this.radioFirstPregnancyYes.click();
    await this.radioMiscarriagesNo.click();
    await this.btnNext.click();

    await this.checkBoxChronicNone.click();
    await this.btnNext.click();

    await this.radioVaginalBleeding.click();
    await this.radioFits.click();
    await this.radioAbdominalPain.click();
    await this.radioHeadache.click();
    await super.scrollView;
    await this.radioPale.click();
    await this.radioFever.click();
    await this.radioSwelling.click();
    await super.scrollView;
    await this.radioBreathlessness.click();
    await this.radioHeartBeat.click();
    await this.btnNext.click();

    await this.radioAlbumin.click();
    await this.btnNext.click();
    await browser.pause(2000);

    await super.scrollView;
    await this.btnNext.click();

    await super.clickDisplayedElem(this.btnSubmit);
    await this.imagePerson.waitForDisplayed();
    await this.iconBack.click();
  }

  async createReportUG () {
    await this.btnAdd.click();
    await this.iconPregnancyReg.click();
    await this.radioReportPregnancy.click();
    const lmpDate = await super.getLmpDate();
    await this.inputLmpDate.waitForDisplayed();
    await this.inputLmpDate.setValue(lmpDate);
    await super.scrollView;
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.inputANCVisit.click();
    await super.clickDisplayedElem(this.selectVisits);
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.radioANCVisits.click();
    await this.btnNext.click();

    await this.radioVaginalBleeding.click();
    await this.radioSevereAbdomenPain.click();
    await this.radioHeadache.click();
    await this.radioPale.click();
    await super.scrollView;
    await this.radioFever.click();
    await this.radioBlurredVision.click();
    await super.scrollView;
    await this.radioSwelling.click();
    await this.radioBreathlessness.click();
    await this.btnNext.click();

    await this.radioMuac.click();
    await this.checkBoxSupplementation.click();
    await super.scrollView;
    await this.radioNutrition.click();
    await this.btnNext.click();

    await this.radioInsecticidalNet.click();
    await this.radioTTCard.click();
    await super.clickDisplayedElem(this.checkBoxVaccineReceived);
    await super.scrollView;
    await this.btnNext.click();

    await super.clickDisplayedElem(this.btnSubmit);
    await this.imagePersonUG.waitForDisplayed();
    await this.iconBack.click();
  }

  async createReportTG () {
    await this.btnAddNew.click();
    await this.iconPregnancyReg.click();
    await this.radioIdentificationTG.click();
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.radioPregnancyConfirm.click();
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.btnNext.click();

    await browser.pause(2000);
    await super.scrollView;
    await super.clickDisplayedElem(this.btnSubmit);
    await this.imagePersonUG.waitForDisplayed();
    await this.iconBack.click();
  }

  async createReportML () {
    await this.btnNewAction.click();
    await this.iconPregnancy.click();
    await this.radioRegistrationDone.click();
    await this.radioIdentificationTG.click();
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.radioPregnancyConfirmed.click();
    await this.checkBoxPregnancyConfirmed.click();
    await this.btnNext.click();

    await this.inputWeight.click();
    await driver.pressKeyCode(16);
    await driver.pressKeyCode(16);
    await this.inputHeight.click();
    await driver.pressKeyCode(8);
    await driver.pressKeyCode(16);
    await driver.pressKeyCode(16);
    await driver.hideKeyboard();
    await browser.pause(1000);
    await this.radioLastPeriod.click();
    const lmpDate = await super.getLmpDate();
    await this.inputLastPeriod.waitForDisplayed();
    await this.inputLastPeriod.setValue(lmpDate);
    await this.radioDateOfDelivery.click();
    await super.scrollView;
    await this.btnPrev.waitForDisplayed();
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.inputPreviousPregnancy.click();
    await driver.pressKeyCode(7);
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.inputPreviousAbortion.click();
    await driver.pressKeyCode(7);
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.radioTDVaccine.click();
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.radioPrenatalVisit.click();
    const ancVisitDate = await super.getFollowUpDate();
    await super.scrollView;
    await this.inputANCVisitML.waitForDisplayed();
    await this.inputANCVisitML.setValue(ancVisitDate);
    await this.btnNext.click();

    await this.radioRefer.click();
    await super.scrollView;
    await this.btnPrev.waitForDisplayed();
    await this.btnNext.click();

    await this.btnPrev.waitForDisplayed();
    await this.inputSolution.click();
    await driver.pressKeyCode(12);
    await super.clickDisplayedElem(this.btnSubmit);
    await this.imagePersonUG.waitForDisplayed();
    await this.iconBack.click();
  }

  async createDefaulterReport () {
    await this.btnAdd.click();
    await this.iconDefaulter.click();
    await this.radioAvailableNo.click();
    const followUpDate = await super.getFollowUpDate();
    await this.inputFollowUpDate.waitForDisplayed();
    await this.inputFollowUpDate.setValue(followUpDate);
    await this.btnNext.click();

    await super.clickDisplayedElem(this.btnSubmit);
    await this.imagePerson.waitForDisplayed();
    await this.iconBack.click();
  }

  async searchPerson (firstName) {
    await this.iconSearch.click();
    await this.inputSearch.waitForDisplayed();
    await this.inputSearch.setValue(firstName);
    await driver.pressKeyCode(66);
    await this.imagePerson.waitForDisplayed();
    await this.inputSearch.click();
    await this.inputSearch.clearValue();
    await driver.pressKeyCode(66);
  }

  async searchPersonUG (firstName) {
    await this.iconSearch.click();
    await this.inputSearch.waitForDisplayed();
    await this.inputSearch.setValue(firstName);
    await driver.pressKeyCode(66);
    await this.imagePersonUG.waitForDisplayed();
    await this.inputSearch.click();
    await this.inputSearch.clearValue();
    await driver.pressKeyCode(66);
  }

  async viewPerson () {
    await super.tabPeople.waitForDisplayed();
    await super.toggleAirplaneMode('on');
    await super.tabPeople.click();
    await super.clickDisplayedElem(this.firstHousehold);
    await this.householdPerson.click();
    await this.iconBack.click();
    await this.firstHousehold.waitForDisplayed();
  }

  async viewPersonKE () {
    await super.tabPeople.waitForDisplayed();
    await super.toggleAirplaneMode('on');
    await super.tabPeople.click();
    await super.clickDisplayedElem(this.firstHouseholdKE);
    await this.householdPerson.click();
    await this.iconBack.click();
    await this.firstHouseholdKE.waitForDisplayed();
  }

  async viewPersonML () {
    await super.tabPeople.waitForDisplayed();
    await super.toggleAirplaneMode('on');
    await super.tabPeople.click();
    await browser.pause(2000);
    await super.clickDisplayedElem(this.firstVillage);
    await this.householdPerson.waitForDisplayed();
    await super.scrollView;
    await this.householdPerson.click();
    await browser.pause(2000);
    await this.iconBack.click();
    await browser.pause(2000);
    await this.firstVillage.waitForDisplayed();
  }

  async viewCHPArea () {
    await super.clickDisplayedElem(super.tabPeople);
    await super.clickDisplayedElem(this.textCHVArea);
    await browser.pause(2000);
    await this.iconBack.click();
    await this.textCHVArea.waitForDisplayed();
  }

  async viewVHTArea () {
    await super.clickDisplayedElem(super.tabPeople);
    await super.clickDisplayedElem(this.textVHTArea);
    await browser.pause(2000);
    await this.iconBack.click();
    await this.textVHTArea.waitForDisplayed();
  }

  async viewCHWSite () {
    await super.clickDisplayedElem(super.tabPeople);
    await super.clickDisplayedElem(this.textCHWSite);
    await browser.pause(5000);
    await this.iconBack.click();
    await browser.pause(2000);
    await this.textCHWSite.waitForDisplayed();
  }

}

module.exports = new ContactsPage();

/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `
<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="enketo_widgets">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Enketo Widgets</h3>
<select id="form-languages" style="display:none;" data-default-lang=""><option value="en">en</option> </select>


    <label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/intro:label"><p>This form showcases the different available Enketo <em>widgets</em>.</p>The hints explain how these widgets were created.</span><input type="text" name="/enketo_widgets/intro" data-type-xml="string" readonly></label>
    <section class="or-group or-appearance-field-list " name="/enketo_widgets/text_widgets"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/text_widgets:label">Text widgets</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/text_widgets/text:label">Text widget</span><span lang="" class="or-hint active">Can be short or long but always one line (type = text)</span><input type="text" name="/enketo_widgets/text_widgets/text" data-type-xml="string"></label><label class="question non-select or-appearance-numbers "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/text_widgets/phone:label">Text widget for phonenumber-like input</span><span lang="" class="or-hint active">This is a text input that will show the numbers keyboard on mobile devices (type=text, appearance=numbers)</span><input type="tel" name="/enketo_widgets/text_widgets/phone" data-type-xml="string"></label><label class="question non-select or-appearance-multiline "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/text_widgets/long_text:label">Multiline Text widget in enketo (in ODK collect this a normal text field)</span><span lang="" class="or-hint active">Can be multiple lines (type=text, appearance=multiline)</span><textarea name="/enketo_widgets/text_widgets/long_text" data-type-xml="string"></textarea></label><label class="question non-select or-appearance-url "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/text_widgets/url:label">URL widget</span><input type="text" name="/enketo_widgets/text_widgets/url" data-type-xml="string" readonly></label>
      </section>
    <section class="or-group or-appearance-field-list " name="/enketo_widgets/number_widgets"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/number_widgets:label">Number widgets</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/number_widgets/int:label">Integer widget (try entering a number &gt; 10)</span><span lang="" class="or-hint active">This field has a constraint (type=integer, constraint=.&lt;10)</span><input type="number" name="/enketo_widgets/number_widgets/int" data-constraint=". &lt; 10" data-type-xml="int"><span class="or-constraint-msg active" lang="" data-i18n="constraint.invalid">Value not allowed</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/number_widgets/decimal:label">Decimal widget (allows only number &gt; 10.51 and &lt; 18.39)</span><span lang="" class="or-hint active">This field has a constraint (type=decimal, constraint=. &gt; 10.51 and . &lt; 18.39)</span><input type="number" name="/enketo_widgets/number_widgets/decimal" data-constraint=". &gt; 10.51 and . &lt; 18.39" data-type-xml="decimal" step="any"><span class="or-constraint-msg active" lang="" data-i18n="constraint.invalid">Value not allowed</span></label>
      </section>
    <section class="or-group or-appearance-field-list " name="/enketo_widgets/range_widgets"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/range_widgets:label">Range widgets</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/range_widgets/range1:label">Range widget 1</span><span lang="" class="or-hint active">A horizontal range widget (type=range)</span><input type="number" name="/enketo_widgets/range_widgets/range1" data-type-xml="int" min="0" max="5" step="1"></label><label class="question non-select or-appearance-vertical "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/range_widgets/range2:label">Range widget 2</span><span lang="" class="or-hint active">A vertical range widget (type=range, appearance=vertical)</span><input type="number" name="/enketo_widgets/range_widgets/range2" data-type-xml="decimal" step="0.1" min="0" max="2"></label><label class="question non-select or-appearance-no-ticks "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/range_widgets/range3:label">Range widget 3</span><span lang="" class="or-hint active">A horizontal range widget without ticks (type=range, appearance=no-ticks)</span><input type="number" name="/enketo_widgets/range_widgets/range3" data-type-xml="int" min="0" max="5" step="1"></label><label class="question or-appearance-picker "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/range_widgets/range4:label">Range picker widget 4</span><span lang="" class="or-hint active">A horizontal range widget without ticks (type=range, appearance=picker)</span><select name="/enketo_widgets/range_widgets/range4" data-type-xml="int" min="0" max="5" step="1"><option value="">...</option>
<option value="0">0</option>
<option value="1">1</option>
<option value="2">2</option>
<option value="3">3</option>
<option value="4">4</option>
<option value="5">5</option></select><span class="or-option-translations" style="display:none;">
        </span></label><label class="question non-select or-appearance-rating "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/range_widgets/range5:label">Rating widget 5</span><span lang="" class="or-hint active">A horizontal range widget without ticks (type=range, appearance=rating)</span><input type="number" name="/enketo_widgets/range_widgets/range5" data-type-xml="int" min="0" max="5" step="1"></label><label class="question non-select or-appearance-distress "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/range_widgets/distress:label">Distress widget</span><span lang="" class="or-hint active">A highly specific widget to measure distress(type=range, appearance=distress)</span><input type="number" name="/enketo_widgets/range_widgets/distress" data-type-xml="int" min="1" max="10" step="1"></label>
      </section>
    <section class="or-group or-appearance-field-list " name="/enketo_widgets/date_time_widgets"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/date_time_widgets:label">Date and time widgets</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/date_time_widgets/date:label">Date widget (this one loads a default value set in the form)</span><input type="date" name="/enketo_widgets/date_time_widgets/date" data-type-xml="date"></label><label class="question non-select or-appearance-month-year "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/date_time_widgets/date_month_year:label">Month-year widget</span><span lang="" class="or-hint active">Simply specify an appearance style (type=date, appearance=month-year)</span><input type="date" name="/enketo_widgets/date_time_widgets/date_month_year" data-type-xml="date"></label><label class="question non-select or-appearance-year "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/date_time_widgets/date_year:label">Year widget (year only)</span><span lang="" class="or-hint active">Simply specify and appearance style (type=date, appearance=year)</span><input type="date" name="/enketo_widgets/date_time_widgets/date_year" data-type-xml="date"></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/date_time_widgets/time:label">Time widget</span><span lang="" class="or-hint active">Times are easy! (type=time)</span><input type="time" name="/enketo_widgets/date_time_widgets/time" data-type-xml="time"></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/date_time_widgets/datetime:label">Date and time widget</span><span lang="" class="or-hint active">For exact times, will be converted to UTC/GMT (type=dateTime)</span><input type="datetime-local" name="/enketo_widgets/date_time_widgets/datetime" data-type-xml="dateTime"></label>
      </section>
    <section class="or-group or-appearance-field-list " name="/enketo_widgets/select_widgets"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets:label">Select widgets</span></h4>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/select:label">Select multiple widget</span><span lang="" class="or-hint active">Using a list specified in the choices worksheet (type=select_multiple)</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/select" value="a" data-constraint="not(selected(., 'c') and selected(., 'd'))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select/a:label">option a</span></label><label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/select" value="b" data-constraint="not(selected(., 'c') and selected(., 'd'))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select/b:label">option b</span></label><label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/select" value="c" data-constraint="not(selected(., 'c') and selected(., 'd'))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select/c:label">option c</span></label><label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/select" value="d" data-constraint="not(selected(., 'c') and selected(., 'd'))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select/d:label">option d</span></label>
</div>
</fieldset>
<span class="or-constraint-msg active" lang="" data-i18n="constraint.invalid">Value not allowed</span>
</fieldset>
<fieldset class="question simple-select or-appearance-columns "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/select_horizontal:label">Select multiple widget displaying horizontally in columns</span><span lang="" class="or-hint active">(type=select_multiple, appearance=columns)</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/select_horizontal" value="yes" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select_horizontal/yes:label">Yes</span></label><label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/select_horizontal" value="no" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select_horizontal/no:label">No</span></label><label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/select_horizontal" value="dk" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select_horizontal/dk:label">Don't Know</span></label><label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/select_horizontal" value="na" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select_horizontal/na:label">Not Applicable</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question simple-select or-appearance-columns-pack "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/select_horizontal_compact:label">Select multiple widget displaying horizontally</span><span lang="" class="or-hint active">(type=select_multiple, appearance=columns-pack)</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/select_horizontal_compact" value="a" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select_horizontal_compact/a:label">option a</span></label><label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/select_horizontal_compact" value="b" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select_horizontal_compact/b:label">option b</span></label><label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/select_horizontal_compact" value="c" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select_horizontal_compact/c:label">option c</span></label><label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/select_horizontal_compact" value="d" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select_horizontal_compact/d:label">option d</span></label>
</div>
</fieldset></fieldset>
<label class="question or-appearance-minimal "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/select_spinner:label">Select multiple: pulldown</span><span lang="" class="or-hint active">Showing a pull-down list of options (type=select_multiple list, appearance=minimal)</span><select multiple name="/enketo_widgets/select_widgets/select_spinner" data-type-xml="select"><option value="">...</option>
<option value="a">option a</option>
<option value="b">option b</option>
<option value="c">option c</option>
<option value="d">option d</option></select><span class="or-option-translations" style="display:none;">
        </span></label><fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/select1:label">Select one widget</span><span lang="" class="or-hint active">This one has default value (type=select_one)</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1" data-name="/enketo_widgets/select_widgets/select1" value="1" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1/1:label">option 1</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1" data-name="/enketo_widgets/select_widgets/select1" value="2" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1/2:label">option 2</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1" data-name="/enketo_widgets/select_widgets/select1" value="3" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1/3:label">option 3</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1" data-name="/enketo_widgets/select_widgets/select1" value="4" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1/4:label">option 4</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1" data-name="/enketo_widgets/select_widgets/select1" value="5" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1/5:label">option 5</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1" data-name="/enketo_widgets/select_widgets/select1" value="6" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1/6:label">option 6</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1" data-name="/enketo_widgets/select_widgets/select1" value="7" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1/7:label">option 7</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1" data-name="/enketo_widgets/select_widgets/select1" value="8" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1/8:label">option 8</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question simple-select or-appearance-columns "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/select1_horizontal:label">Select one widget displaying horizontally in columns</span><span lang="" class="or-hint active">(type=select_one, appearance=columns)</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_horizontal" data-name="/enketo_widgets/select_widgets/select1_horizontal" value="1" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_horizontal/1:label">option 1</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_horizontal" data-name="/enketo_widgets/select_widgets/select1_horizontal" value="2" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_horizontal/2:label">option 2</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_horizontal" data-name="/enketo_widgets/select_widgets/select1_horizontal" value="3" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_horizontal/3:label">option 3</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_horizontal" data-name="/enketo_widgets/select_widgets/select1_horizontal" value="4" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_horizontal/4:label">option 4</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_horizontal" data-name="/enketo_widgets/select_widgets/select1_horizontal" value="5" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_horizontal/5:label">option 5</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_horizontal" data-name="/enketo_widgets/select_widgets/select1_horizontal" value="6" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_horizontal/6:label">option 6</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_horizontal" data-name="/enketo_widgets/select_widgets/select1_horizontal" value="7" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_horizontal/7:label">option 7</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_horizontal" data-name="/enketo_widgets/select_widgets/select1_horizontal" value="8" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_horizontal/8:label">option 8</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question or-appearance-columns-pack or-appearance-no-buttons "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/select1_horizontal_compact:label">Select one widget displaying horizontally</span><span lang="" class="or-hint active">(type=select_one, appearance=columns-pack no-buttons)</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_horizontal_compact" data-name="/enketo_widgets/select_widgets/select1_horizontal_compact" value="yes" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_horizontal_compact/yes:label">Yes</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_horizontal_compact" data-name="/enketo_widgets/select_widgets/select1_horizontal_compact" value="no" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_horizontal_compact/no:label">No</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_horizontal_compact" data-name="/enketo_widgets/select_widgets/select1_horizontal_compact" value="dk" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_horizontal_compact/dk:label">Don't Know</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_horizontal_compact" data-name="/enketo_widgets/select_widgets/select1_horizontal_compact" value="na" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_horizontal_compact/na:label">Not Applicable</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question or-appearance-likert "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/select1_likert:label">Select one displaying as a Likert item</span><span lang="" class="or-hint active">(type=select_one, appearance=likert)</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_likert" data-name="/enketo_widgets/select_widgets/select1_likert" value="1" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_likert/1:label">strongly disagree</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_likert" data-name="/enketo_widgets/select_widgets/select1_likert" value="2" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_likert/2:label">disagree</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_likert" data-name="/enketo_widgets/select_widgets/select1_likert" value="3" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_likert/3:label">neither agree nor disagree</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_likert" data-name="/enketo_widgets/select_widgets/select1_likert" value="4" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_likert/4:label">agree</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/select1_likert" data-name="/enketo_widgets/select_widgets/select1_likert" value="5" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/select1_likert/5:label">strongly agree</span></label>
</div>
</fieldset></fieldset>
<label class="question or-appearance-minimal "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/select1_spinner:label">Select one: pulldown</span><span lang="" class="or-hint active">Showing a pull-down list of options (type=select_one list, appearance=minimal)</span><select name="/enketo_widgets/select_widgets/select1_spinner" data-name="/enketo_widgets/select_widgets/select1_spinner" data-type-xml="select1"><option value="">...</option>
<option value="a">option a</option>
<option value="b">option b</option>
<option value="c">option c</option>
<option value="d">option d</option></select><span class="or-option-translations" style="display:none;">
        </span></label><label class="question or-appearance-autocomplete "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/select1_autocomplete:label">Select one autocomplete widget</span><span lang="" class="or-hint active">Type e.g. 'g' to filter options. <br>(type=select_one, appearance=autocomplete)</span><input name="/enketo_widgets/select_widgets/select1_autocomplete" data-name="/enketo_widgets/select_widgets/select1_autocomplete" data-type-xml="select1" type="text" list="enketowidgetsselectwidgetsselect1autocomplete"><datalist id="enketowidgetsselectwidgetsselect1autocomplete"><option value="">...</option>
<option value="king">kingfisher</option>
<option value="pig">pigeon</option>
<option value="nut">nuthatch</option></datalist><span class="or-option-translations" style="display:none;">
        </span></label><fieldset class="question or-appearance-no-buttons "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/grid_test:label">No buttons</span><span lang="" class="or-hint active">Make sure to put a.png and b.png in the impages folder to see images here. (type=select_one, appearance=no-buttons)</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/select_widgets/grid_test" data-name="/enketo_widgets/select_widgets/grid_test" value="a" data-type-xml="select1"><span lang="en" class="option-label active">
        </span><img lang="en" class="active" data-media-src="images/a.png" data-itext-id="/enketo_widgets/select_widgets/grid_test/a:label" alt="image"></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/grid_test" data-name="/enketo_widgets/select_widgets/grid_test" value="b" data-type-xml="select1"><span lang="en" class="option-label active">
        </span><img lang="en" class="active" data-media-src="images/b.png" data-itext-id="/enketo_widgets/select_widgets/grid_test/b:label" alt="image"></label>
</div>
</fieldset></fieldset>
<fieldset class="question or-appearance-columns-2 or-appearance-no-buttons "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/grid_2_columns:label">Fixed number of columns (2), and no buttons</span><span lang="" class="or-hint active">Grid with a maximum of 2 columns. (type=select<em>one a</em>b, appearance=columns-2 no-buttons)</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/select_widgets/grid_2_columns" data-name="/enketo_widgets/select_widgets/grid_2_columns" value="a" data-type-xml="select1"><span lang="en" class="option-label active">
        </span><img lang="en" class="active" data-media-src="images/a.png" data-itext-id="/enketo_widgets/select_widgets/grid_2_columns/a:label" alt="image"></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/grid_2_columns" data-name="/enketo_widgets/select_widgets/grid_2_columns" value="b" data-type-xml="select1"><span lang="en" class="option-label active">
        </span><img lang="en" class="active" data-media-src="images/b.png" data-itext-id="/enketo_widgets/select_widgets/grid_2_columns/b:label" alt="image"></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/grid_2_columns" data-name="/enketo_widgets/select_widgets/grid_2_columns" value="c" data-type-xml="select1"><span lang="en" class="option-label active">
        </span><img lang="en" class="active" data-media-src="images/c.png" data-itext-id="/enketo_widgets/select_widgets/grid_2_columns/c:label" alt="image"></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/grid_2_columns" data-name="/enketo_widgets/select_widgets/grid_2_columns" value="d" data-type-xml="select1"><span lang="en" class="option-label active">
        </span><img lang="en" class="active" data-media-src="images/d.png" data-itext-id="/enketo_widgets/select_widgets/grid_2_columns/d:label" alt="image"></label>
</div>
</fieldset></fieldset>
<section class="or-group or-appearance-field-list " name="/enketo_widgets/select_widgets/table_list_test"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test:label">Table</span></h4>
<fieldset class="question or-appearance-label "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_test_label:label">Table</span><span lang="" class="or-hint active">Show only the labels of these options and not the inputs (type=select<em>one yes</em>no, appearance=label)</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test/table_list_test_label" data-name="/enketo_widgets/select_widgets/table_list_test/table_list_test_label" value="yes" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_test_label/yes:label">Yes</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test/table_list_test_label" data-name="/enketo_widgets/select_widgets/table_list_test/table_list_test_label" value="no" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_test_label/no:label">No</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test/table_list_test_label" data-name="/enketo_widgets/select_widgets/table_list_test/table_list_test_label" value="dk" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_test_label/dk:label">Don't Know</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test/table_list_test_label" data-name="/enketo_widgets/select_widgets/table_list_test/table_list_test_label" value="na" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_test_label/na:label">Not Applicable</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question or-appearance-list-nolabel "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_1:label">Q1</span><span lang="" class="or-hint active">Show only the inputs of these options and not the labels (type=select<em>one yes</em>no, appearance=list-nolabel)</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test/table_list_1" data-name="/enketo_widgets/select_widgets/table_list_test/table_list_1" value="yes" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_1/yes:label">Yes</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test/table_list_1" data-name="/enketo_widgets/select_widgets/table_list_test/table_list_1" value="no" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_1/no:label">No</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test/table_list_1" data-name="/enketo_widgets/select_widgets/table_list_test/table_list_1" value="dk" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_1/dk:label">Don't Know</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test/table_list_1" data-name="/enketo_widgets/select_widgets/table_list_test/table_list_1" value="na" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_1/na:label">Not Applicable</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question or-appearance-list-nolabel "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_2:label">Question 2</span><span lang="" class="or-hint active">Show only the inputs of these options and not the labels (type=select<em>one yes</em>no, appearance=list-nolabel)</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test/table_list_2" data-name="/enketo_widgets/select_widgets/table_list_test/table_list_2" value="yes" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_2/yes:label">Yes</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test/table_list_2" data-name="/enketo_widgets/select_widgets/table_list_test/table_list_2" value="no" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_2/no:label">No</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test/table_list_2" data-name="/enketo_widgets/select_widgets/table_list_test/table_list_2" value="dk" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_2/dk:label">Don't Know</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test/table_list_2" data-name="/enketo_widgets/select_widgets/table_list_test/table_list_2" value="na" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test/table_list_2/na:label">Not Applicable</span></label>
</div>
</fieldset></fieldset>
      </section><section class="or-group-data or-appearance-field-list " name="/enketo_widgets/select_widgets/table_list_test2"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/generated_table_list_label_46:label">Table (alternative method)</span><input type="text" name="/enketo_widgets/select_widgets/table_list_test2/generated_table_list_label_46" data-type-xml="string" readonly></label><fieldset class="question or-appearance-label "><fieldset>
<legend>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47" data-name="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47" value="yes" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47/yes:label">Yes</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47" data-name="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47" value="no" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47/no:label">No</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47" data-name="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47" value="dk" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47/dk:label">Don't Know</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47" data-name="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47" value="na" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47/na:label">Not Applicable</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question or-appearance-list-nolabel "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/table_list_3:label">Q1</span><span lang="" class="or-hint active">No need to do anything special here</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test2/table_list_3" data-name="/enketo_widgets/select_widgets/table_list_test2/table_list_3" value="yes" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/table_list_3/yes:label">Yes</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test2/table_list_3" data-name="/enketo_widgets/select_widgets/table_list_test2/table_list_3" value="no" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/table_list_3/no:label">No</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test2/table_list_3" data-name="/enketo_widgets/select_widgets/table_list_test2/table_list_3" value="dk" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/table_list_3/dk:label">Don't Know</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test2/table_list_3" data-name="/enketo_widgets/select_widgets/table_list_test2/table_list_3" value="na" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/table_list_3/na:label">Not Applicable</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question or-appearance-list-nolabel "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/table_list_4:label">Question 2</span><span lang="" class="or-hint active">No need to do anything special here</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test2/table_list_4" data-name="/enketo_widgets/select_widgets/table_list_test2/table_list_4" value="yes" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/table_list_4/yes:label">Yes</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test2/table_list_4" data-name="/enketo_widgets/select_widgets/table_list_test2/table_list_4" value="no" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/table_list_4/no:label">No</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test2/table_list_4" data-name="/enketo_widgets/select_widgets/table_list_test2/table_list_4" value="dk" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/table_list_4/dk:label">Don't Know</span></label><label class=""><input type="radio" name="/enketo_widgets/select_widgets/table_list_test2/table_list_4" data-name="/enketo_widgets/select_widgets/table_list_test2/table_list_4" value="na" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/select_widgets/table_list_test2/table_list_4/na:label">Not Applicable</span></label>
</div>
</fieldset></fieldset>
      </section><section class="or-group-data or-appearance-field-list " name="/enketo_widgets/select_widgets/happy_sad_table"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/happy_sad_table/generated_table_list_label_50:label">Table with image labels (alternative method)</span><input type="text" name="/enketo_widgets/select_widgets/happy_sad_table/generated_table_list_label_50" data-type-xml="string" readonly></label><fieldset class="question or-appearance-label "><fieldset>
<legend>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/happy_sad_table/reserved_name_for_field_list_labels_51" value="happy" data-type-xml="select"><span lang="en" class="option-label active">
        </span><img lang="en" class="active" data-media-src="images/happy.png" data-itext-id="/enketo_widgets/select_widgets/happy_sad_table/reserved_name_for_field_list_labels_51/happy:label" alt="image"></label><label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/happy_sad_table/reserved_name_for_field_list_labels_51" value="sad" data-type-xml="select"><span lang="en" class="option-label active">
        </span><img lang="en" class="active" data-media-src="images/sad.png" data-itext-id="/enketo_widgets/select_widgets/happy_sad_table/reserved_name_for_field_list_labels_51/sad:label" alt="image"></label>
</div>
</fieldset></fieldset>
<fieldset class="question or-appearance-list-nolabel "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_brian:label">Brian</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_brian" value="happy" data-type-xml="select"><span lang="en" class="option-label active">
        </span><img lang="en" class="active" data-media-src="images/happy.png" data-itext-id="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_brian/happy:label" alt="image"></label><label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_brian" value="sad" data-type-xml="select"><span lang="en" class="option-label active">
        </span><img lang="en" class="active" data-media-src="images/sad.png" data-itext-id="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_brian/sad:label" alt="image"></label>
</div>
</fieldset></fieldset>
<fieldset class="question or-appearance-list-nolabel "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_michael:label">Michael</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_michael" value="happy" data-type-xml="select"><span lang="en" class="option-label active">
        </span><img lang="en" class="active" data-media-src="images/happy.png" data-itext-id="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_michael/happy:label" alt="image"></label><label class=""><input type="checkbox" name="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_michael" value="sad" data-type-xml="select"><span lang="en" class="option-label active">
        </span><img lang="en" class="active" data-media-src="images/sad.png" data-itext-id="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_michael/sad:label" alt="image"></label>
</div>
</fieldset></fieldset>
      </section>
      </section>
    <section class="or-group or-appearance-field-list " name="/enketo_widgets/cascading_widgets"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets:label">Cascading Select widgets</span></h4>
<section class="or-group " name="/enketo_widgets/cascading_widgets/group1"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group1:label">Cascading Selects with Radio Buttons</span></h4>
<fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group1/country:label">Country</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/cascading_widgets/group1/country" data-name="/enketo_widgets/cascading_widgets/group1/country" value="nl" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/cascading_widgets/group1/country/nl:label">The Netherlands</span></label><label class=""><input type="radio" name="/enketo_widgets/cascading_widgets/group1/country" data-name="/enketo_widgets/cascading_widgets/group1/country" value="usa" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/cascading_widgets/group1/country/usa:label">United States</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group1/city:label">City</span><span lang="" class="or-hint active">Using a choice filter to update options based on a previous answer (choice_filter: country = <span class="or-output" data-value=" /enketo_widgets/cascading_widgets/group1/country "> </span>)</span>
          </legend>
<div class="option-wrapper">
<label class="itemset-template" data-items-path="instance('cities')/root/item[country= /enketo_widgets/cascading_widgets/group1/country ]"><input type="radio" name="/enketo_widgets/cascading_widgets/group1/city" data-name="/enketo_widgets/cascading_widgets/group1/city" data-type-xml="select1" value=""></label><span class="itemset-labels" data-value-ref="name" data-label-type="itext" data-label-ref="itextId"><span lang="en" class="option-label active" data-itext-id="static_instance-cities-0">Amsterdam</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-1">Denver</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-2">New York City</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-3">Los Angeles</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-4">Rotterdam</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-5">Dronten</span>
      </span>
</div>
</fieldset></fieldset>
<fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group1/neighborhood:label">Neighborhood</span><span lang="" class="or-hint active">Using a choice filter to update options based on previous answers (choice_filter: country = <span class="or-output" data-value=" /enketo_widgets/cascading_widgets/group1/country "> </span> and city = <span class="or-output" data-value=" /enketo_widgets/cascading_widgets/group1/city "> </span>)</span>
          </legend>
<div class="option-wrapper">
<label class="itemset-template" data-items-path="instance('neighborhoods')/root/item[country= /enketo_widgets/cascading_widgets/group1/country  and city= /enketo_widgets/cascading_widgets/group1/city ]"><input type="radio" name="/enketo_widgets/cascading_widgets/group1/neighborhood" data-name="/enketo_widgets/cascading_widgets/group1/neighborhood" data-type-xml="select1" value=""></label><span class="itemset-labels" data-value-ref="name" data-label-type="itext" data-label-ref="itextId"><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-0">Bronx</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-1">Harlem</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-2">Bel Air</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-3">Westerpark</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-4">Park Hill</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-5">Harbor</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-6">Dam</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-7">Downtown</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-8">Harbor</span>
      </span>
</div>
</fieldset></fieldset>
      </section><section class="or-group " name="/enketo_widgets/cascading_widgets/group2"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group2:label">Cascading Selects with Pulldowns</span></h4>
<label class="question or-appearance-minimal "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group2/country2:label">Country</span><span lang="" class="or-hint active">(appearance: minimal)</span><select name="/enketo_widgets/cascading_widgets/group2/country2" data-name="/enketo_widgets/cascading_widgets/group2/country2" data-type-xml="select1"><option value="">...</option>
<option value="nl">The Netherlands</option>
<option value="usa">United States</option></select><span class="or-option-translations" style="display:none;">
        </span></label><label class="question or-appearance-minimal "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group2/city2:label">City</span><span lang="" class="or-hint active">Using a choice filter to update options based on a previous answer (choice_filter: country = <span class="or-output" data-value=" /enketo_widgets/cascading_widgets/group2/country2 "> </span>, appearance: minimal)</span><select name="/enketo_widgets/cascading_widgets/group2/city2" data-name="/enketo_widgets/cascading_widgets/group2/city2" data-type-xml="select1"><option class="itemset-template" value="" data-items-path="instance('cities')/root/item[country= /enketo_widgets/cascading_widgets/group2/country2 ]">...</option></select><span class="or-option-translations" style="display:none;">
        </span><span class="itemset-labels" data-value-ref="name" data-label-type="itext" data-label-ref="itextId"><span lang="en" class="option-label active" data-itext-id="static_instance-cities-0">Amsterdam</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-1">Denver</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-2">New York City</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-3">Los Angeles</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-4">Rotterdam</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-5">Dronten</span>
      </span></label><label class="question or-appearance-minimal "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group2/neighborhood2:label">Neighborhood</span><span lang="" class="or-hint active">Using a choice filter to update options based on previous answers (choice_filter: country = <span class="or-output" data-value=" /enketo_widgets/cascading_widgets/group2/country2 "> </span> and city = <span class="or-output" data-value=" /enketo_widgets/cascading_widgets/group2/city2 "> </span>, appearance = minimal)</span><select name="/enketo_widgets/cascading_widgets/group2/neighborhood2" data-name="/enketo_widgets/cascading_widgets/group2/neighborhood2" data-type-xml="select1"><option class="itemset-template" value="" data-items-path="instance('neighborhoods')/root/item[country= /enketo_widgets/cascading_widgets/group2/country2  and city= /enketo_widgets/cascading_widgets/group2/city2 ]">...</option></select><span class="or-option-translations" style="display:none;">
        </span><span class="itemset-labels" data-value-ref="name" data-label-type="itext" data-label-ref="itextId"><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-0">Bronx</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-1">Harlem</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-2">Bel Air</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-3">Westerpark</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-4">Park Hill</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-5">Harbor</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-6">Dam</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-7">Downtown</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-8">Harbor</span>
      </span></label>
      </section>
      </section>
    <section class="or-group or-appearance-field-list " name="/enketo_widgets/geopoint_widgets"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/geopoint_widgets:label">Geo widgets</span></h4>
<label class="question non-select or-appearance-maps "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/geopoint_widgets/geopoint_map:label">Geopoint with map Widget</span><span lang="" class="or-hint active">Record the gps location (type=geopoint, appearance=maps)</span><input type="text" name="/enketo_widgets/geopoint_widgets/geopoint_map" data-type-xml="geopoint"></label><label class="question non-select or-appearance-maps or-appearance-hide-input "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/geopoint_widgets/geopoint_hide:label">Geopoint widget that hides input fields by default</span><span lang="" class="or-hint active">Show a larger map (on desktop screens), you can hide the input fields. (appearance=hide-input)</span><input type="text" name="/enketo_widgets/geopoint_widgets/geopoint_hide" data-type-xml="geopoint"></label><label class="question non-select or-appearance-maps or-appearance-hide-input "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/geopoint_widgets/geotrace:label">Geotrace widget</span><span lang="" class="or-hint active">Record a sequence of geopoints (type=geotrace, appearance=maps hide-input)</span><input type="text" name="/enketo_widgets/geopoint_widgets/geotrace" data-type-xml="geotrace"></label><label class="question non-select or-appearance-maps or-appearance-hide-input "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/geopoint_widgets/geoshape:label">Geoshape widget</span><span lang="" class="or-hint active">Record a closed sequence/polygon of geopoints (type=geoshape, appearance=maps hide-input)</span><input type="text" name="/enketo_widgets/geopoint_widgets/geoshape" data-type-xml="geoshape"></label>
      </section>
    <section class="or-group or-appearance-field-list " name="/enketo_widgets/media_widgets"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/media_widgets:label">Media input widgets</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/media_widgets/image:label">Image widget</span><span lang="" class="or-hint active">Select an image or take a photo (type=image)</span><input type="file" name="/enketo_widgets/media_widgets/image" data-type-xml="binary" accept="image/*"></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/media_widgets/audio:label">Audio widget</span><span lang="" class="or-hint active">Select an audio file or record audio (type=audio)</span><input type="file" name="/enketo_widgets/media_widgets/audio" data-type-xml="binary" accept="audio/*"></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/media_widgets/video:label">Video widget</span><span lang="" class="or-hint active">Select a video file or record a video (type=video)</span><input type="file" name="/enketo_widgets/media_widgets/video" data-type-xml="binary" accept="video/*"></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/media_widgets/file:label">File widget (any type)</span><span lang="" class="or-hint active">Select any file (no previews)</span><input type="file" name="/enketo_widgets/media_widgets/file" data-type-xml="binary" accept="text/plain,application/pdf,application/vnd.ms-excel,application/msword,text/richtext,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/x-zip,application/x-zip-compressed"></label>
      </section>
    <section class="or-group or-appearance-field-list " name="/enketo_widgets/display_widgets"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/display_widgets:label">Display widgets</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/display_widgets/output:label">Note widget. In notes you can emphasize <em>words</em> or <em>multiple words</em> or <strong>strongly emphasize something</strong>.<br><p>You can also use a line break to start a new sentence.</p>The decimal number you entered was <span class="or-output" data-value=" /enketo_widgets/number_widgets/decimal "> </span>.</span><span lang="" class="or-hint active">This is a note and it uses a value of another field in its label (type=note)</span><input type="text" name="/enketo_widgets/display_widgets/output" data-type-xml="string" readonly></label><fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/display_widgets/select_media:label">You can also add media to choices. Choose your favorite bird.</span><span lang="" class="or-hint active">Add the file name in the image column on your choices sheet. Make sure you upload this file when you publish your form.</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/display_widgets/select_media" data-name="/enketo_widgets/display_widgets/select_media" value="king" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/display_widgets/select_media/king:label">kingfisher</span><img lang="en" class="active" data-media-src="images/kingfisher.png" data-itext-id="/enketo_widgets/display_widgets/select_media/king:label" alt="image"></label><label class=""><input type="radio" name="/enketo_widgets/display_widgets/select_media" data-name="/enketo_widgets/display_widgets/select_media" value="pig" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/display_widgets/select_media/pig:label">pigeon</span><img lang="en" class="active" data-media-src="images/pigeon.png" data-itext-id="/enketo_widgets/display_widgets/select_media/pig:label" alt="image"></label><label class=""><input type="radio" name="/enketo_widgets/display_widgets/select_media" data-name="/enketo_widgets/display_widgets/select_media" value="nut" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/display_widgets/select_media/nut:label">nuthatch</span><img lang="en" class="active" data-media-src="images/nuthatch.png" data-itext-id="/enketo_widgets/display_widgets/select_media/nut:label" alt="image"></label>
</div>
</fieldset></fieldset>
<fieldset class="question simple-select trigger "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/display_widgets/trigger:label">Acknowledge widget</span><span lang="" class="or-hint active">Prompts for confirmation. Useful to combine with required or relevant. (type=trigger)</span>
          </legend>
<div class="option-wrapper"><label><input value="OK" type="radio" name="/enketo_widgets/display_widgets/trigger" data-name="/enketo_widgets/display_widgets/trigger" data-type-xml="string"><span class="option-label active" lang="">OK</span></label></div>
</fieldset></fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/display_widgets/calc_note:label">This shows the outcome of a hidden calculation: <span class="or-output" data-value=" /enketo_widgets/display_widgets/calc "> </span></span><span lang="" class="or-hint active">Calculations are very powerful feature. They are not only used for displaying results but can also be used in skip logic and validation.</span><input type="text" name="/enketo_widgets/display_widgets/calc_note" data-type-xml="string" readonly></label>
      </section>

<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/enketo_widgets/display_widgets/calc" data-calculate=" /enketo_widgets/number_widgets/decimal +3" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/enketo_widgets/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>
`,

  formModel: `
<model>
    <instance>
        <enketo_widgets xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="enketo_widgets" prefix="J1!enketo_widgets!" version="2021-09-24 00:00:00">
          <intro/>
          <text_widgets>
            <text/>
            <phone/>
            <long_text/>
            <url>https://enketo.org</url>
          </text_widgets>
          <number_widgets>
            <int/>
            <decimal>18.31</decimal>
          </number_widgets>
          <range_widgets>
            <range1/>
            <range2/>
            <range3/>
            <range4/>
            <range5/>
            <distress/>
          </range_widgets>
          <date_time_widgets>
            <date>2010-06-15</date>
            <date_month_year/>
            <date_year/>
            <time/>
            <datetime/>
          </date_time_widgets>
          <select_widgets>
            <select>a c</select>
            <select_horizontal/>
            <select_horizontal_compact/>
            <select_spinner/>
            <select1>8</select1>
            <select1_horizontal/>
            <select1_horizontal_compact/>
            <select1_likert/>
            <select1_spinner/>
            <select1_autocomplete/>
            <grid_test/>
            <grid_2_columns/>
            <table_list_test>
              <table_list_test_label/>
              <table_list_1/>
              <table_list_2/>
            </table_list_test>
            <table_list_test2>
              <generated_table_list_label_46/>
              <reserved_name_for_field_list_labels_47/>
              <table_list_3/>
              <table_list_4/>
            </table_list_test2>
            <happy_sad_table>
              <generated_table_list_label_50/>
              <reserved_name_for_field_list_labels_51/>
              <happy_sad_brian/>
              <happy_sad_michael/>
            </happy_sad_table>
          </select_widgets>
          <cascading_widgets>
            <group1>
              <country/>
              <city/>
              <neighborhood/>
            </group1>
            <group2>
              <country2/>
              <city2/>
              <neighborhood2/>
            </group2>
          </cascading_widgets>
          <geopoint_widgets>
            <geopoint_map/>
            <geopoint_hide/>
            <geotrace/>
            <geoshape/>
          </geopoint_widgets>
          <media_widgets>
            <image/>
            <audio/>
            <video/>
            <file/>
          </media_widgets>
          <display_widgets><output/><select_media/>
            <trigger/>
            <calc/>
            <calc_note/>
          </display_widgets>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </enketo_widgets>
      </instance>
    <instance id="contact-summary"/>
    <instance id="list">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-list-0</itextId>
            <name>a</name>
          </item>
          <item>
            <itextId>static_instance-list-1</itextId>
            <name>b</name>
          </item>
          <item>
            <itextId>static_instance-list-2</itextId>
            <name>c</name>
          </item>
          <item>
            <itextId>static_instance-list-3</itextId>
            <name>d</name>
          </item>
        </root>
      </instance>
    <instance id="list1">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-list1-0</itextId>
            <name>king</name>
          </item>
          <item>
            <itextId>static_instance-list1-1</itextId>
            <name>pig</name>
          </item>
          <item>
            <itextId>static_instance-list1-2</itextId>
            <name>nut</name>
          </item>
        </root>
      </instance>
    <instance id="list2">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-list2-0</itextId>
            <name>1</name>
          </item>
          <item>
            <itextId>static_instance-list2-1</itextId>
            <name>2</name>
          </item>
          <item>
            <itextId>static_instance-list2-2</itextId>
            <name>3</name>
          </item>
          <item>
            <itextId>static_instance-list2-3</itextId>
            <name>4</name>
          </item>
          <item>
            <itextId>static_instance-list2-4</itextId>
            <name>5</name>
          </item>
          <item>
            <itextId>static_instance-list2-5</itextId>
            <name>6</name>
          </item>
          <item>
            <itextId>static_instance-list2-6</itextId>
            <name>7</name>
          </item>
          <item>
            <itextId>static_instance-list2-7</itextId>
            <name>8</name>
          </item>
        </root>
      </instance>
    <instance id="yes_no">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-yes_no-0</itextId>
            <name>yes</name>
          </item>
          <item>
            <itextId>static_instance-yes_no-1</itextId>
            <name>no</name>
          </item>
          <item>
            <itextId>static_instance-yes_no-2</itextId>
            <name>dk</name>
          </item>
          <item>
            <itextId>static_instance-yes_no-3</itextId>
            <name>na</name>
          </item>
        </root>
      </instance>
    <instance id="agree5">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-agree5-0</itextId>
            <name>1</name>
          </item>
          <item>
            <itextId>static_instance-agree5-1</itextId>
            <name>2</name>
          </item>
          <item>
            <itextId>static_instance-agree5-2</itextId>
            <name>3</name>
          </item>
          <item>
            <itextId>static_instance-agree5-3</itextId>
            <name>4</name>
          </item>
          <item>
            <itextId>static_instance-agree5-4</itextId>
            <name>5</name>
          </item>
        </root>
      </instance>
    <instance id="holiday">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-holiday-0</itextId>
            <name>a</name>
          </item>
          <item>
            <itextId>static_instance-holiday-1</itextId>
            <name>b</name>
          </item>
          <item>
            <itextId>static_instance-holiday-2</itextId>
            <name>c</name>
          </item>
          <item>
            <itextId>static_instance-holiday-3</itextId>
            <name>d</name>
          </item>
          <item>
            <itextId>static_instance-holiday-4</itextId>
            <name>e</name>
          </item>
          <item>
            <itextId>static_instance-holiday-5</itextId>
            <name>f</name>
          </item>
        </root>
      </instance>
    <instance id="a_b">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-a_b-0</itextId>
            <name>a</name>
          </item>
          <item>
            <itextId>static_instance-a_b-1</itextId>
            <name>b</name>
          </item>
        </root>
      </instance>
    <instance id="a_b_c_d">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-a_b_c_d-0</itextId>
            <name>a</name>
          </item>
          <item>
            <itextId>static_instance-a_b_c_d-1</itextId>
            <name>b</name>
          </item>
          <item>
            <itextId>static_instance-a_b_c_d-2</itextId>
            <name>c</name>
          </item>
          <item>
            <itextId>static_instance-a_b_c_d-3</itextId>
            <name>d</name>
          </item>
        </root>
      </instance>
    <instance id="happy_sad">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-happy_sad-0</itextId>
            <name>happy</name>
          </item>
          <item>
            <itextId>static_instance-happy_sad-1</itextId>
            <name>sad</name>
          </item>
        </root>
      </instance>
    <instance id="countries">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-countries-0</itextId>
            <name>nl</name>
          </item>
          <item>
            <itextId>static_instance-countries-1</itextId>
            <name>usa</name>
          </item>
        </root>
      </instance>
    <instance id="cities">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-cities-0</itextId>
            <name>ams</name>
            <country>nl</country>
          </item>
          <item>
            <itextId>static_instance-cities-1</itextId>
            <name>den</name>
            <country>usa</country>
          </item>
          <item>
            <itextId>static_instance-cities-2</itextId>
            <name>nyc</name>
            <country>usa</country>
          </item>
          <item>
            <itextId>static_instance-cities-3</itextId>
            <name>la</name>
            <country>usa</country>
          </item>
          <item>
            <itextId>static_instance-cities-4</itextId>
            <name>rot</name>
            <country>nl</country>
          </item>
          <item>
            <itextId>static_instance-cities-5</itextId>
            <name>dro</name>
            <country>nl</country>
          </item>
        </root>
      </instance>
    <instance id="neighborhoods">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-neighborhoods-0</itextId>
            <country>usa</country>
            <name>bronx</name>
            <city>nyc</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-1</itextId>
            <country>usa</country>
            <name>harlem</name>
            <city>nyc</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-2</itextId>
            <country>usa</country>
            <name>belair</name>
            <city>la</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-3</itextId>
            <country>nl</country>
            <name>wes</name>
            <city>ams</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-4</itextId>
            <country>usa</country>
            <name>parkhill</name>
            <city>den</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-5</itextId>
            <country>nl</country>
            <name>haven</name>
            <city>rot</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-6</itextId>
            <country>nl</country>
            <name>dam</name>
            <city>ams</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-7</itextId>
            <country>nl</country>
            <name>centrum</name>
            <city>rot</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-8</itextId>
            <country>nl</country>
            <name>havendr</name>
            <city>dro</city>
          </item>
        </root>
      </instance>
  </model>
`,

  formXml: `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Enketo Widgets</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/enketo_widgets/cascading_widgets/group1/city:label">
            <value>City</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group1/country/nl:label">
            <value>The Netherlands</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group1/country/usa:label">
            <value>United States</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group1/country:label">
            <value>Country</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group1/neighborhood:label">
            <value>Neighborhood</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group1:label">
            <value>Cascading Selects with Radio Buttons</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group2/city2:label">
            <value>City</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group2/country2/nl:label">
            <value>The Netherlands</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group2/country2/usa:label">
            <value>United States</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group2/country2:label">
            <value>Country</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group2/neighborhood2:label">
            <value>Neighborhood</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group2:label">
            <value>Cascading Selects with Pulldowns</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets:label">
            <value>Cascading Select widgets</value>
          </text>
          <text id="/enketo_widgets/date_time_widgets/date:label">
            <value>Date widget (this one loads a default value set in the form)</value>
          </text>
          <text id="/enketo_widgets/date_time_widgets/date_month_year:label">
            <value>Month-year widget</value>
          </text>
          <text id="/enketo_widgets/date_time_widgets/date_year:label">
            <value>Year widget (year only)</value>
          </text>
          <text id="/enketo_widgets/date_time_widgets/datetime:label">
            <value>Date and time widget</value>
          </text>
          <text id="/enketo_widgets/date_time_widgets/time:label">
            <value>Time widget</value>
          </text>
          <text id="/enketo_widgets/date_time_widgets:label">
            <value>Date and time widgets</value>
          </text>
          <text id="/enketo_widgets/display_widgets/calc_note:label">
            <value>This shows the outcome of a hidden calculation: <output value=" /enketo_widgets/display_widgets/calc "/></value>
          </text>
          <text id="/enketo_widgets/display_widgets/output:label">
            <value>Note widget. In notes you can emphasize _words_ or _multiple words_ or __strongly emphasize something__.
You can also use a line break to start a new sentence.

The decimal number you entered was <output value=" /enketo_widgets/number_widgets/decimal "/>.</value>
          </text>
          <text id="/enketo_widgets/display_widgets/select_media/king:label">
            <value>kingfisher</value>
            <value form="image">jr://images/kingfisher.png</value>
          </text>
          <text id="/enketo_widgets/display_widgets/select_media/nut:label">
            <value>nuthatch</value>
            <value form="image">jr://images/nuthatch.png</value>
          </text>
          <text id="/enketo_widgets/display_widgets/select_media/pig:label">
            <value>pigeon</value>
            <value form="image">jr://images/pigeon.png</value>
          </text>
          <text id="/enketo_widgets/display_widgets/select_media:label">
            <value>You can also add media to choices. Choose your favorite bird.</value>
          </text>
          <text id="/enketo_widgets/display_widgets/trigger:label">
            <value>Acknowledge widget</value>
          </text>
          <text id="/enketo_widgets/display_widgets:label">
            <value>Display widgets</value>
          </text>
          <text id="/enketo_widgets/geopoint_widgets/geopoint_hide:label">
            <value>Geopoint widget that hides input fields by default</value>
          </text>
          <text id="/enketo_widgets/geopoint_widgets/geopoint_map:label">
            <value>Geopoint with map Widget</value>
          </text>
          <text id="/enketo_widgets/geopoint_widgets/geoshape:label">
            <value>Geoshape widget</value>
          </text>
          <text id="/enketo_widgets/geopoint_widgets/geotrace:label">
            <value>Geotrace widget</value>
          </text>
          <text id="/enketo_widgets/geopoint_widgets:label">
            <value>Geo widgets</value>
          </text>
          <text id="/enketo_widgets/intro:label">
            <value>This form showcases the different available Enketo _widgets_.

The hints explain how these widgets were created.</value>
          </text>
          <text id="/enketo_widgets/media_widgets/audio:label">
            <value>Audio widget</value>
          </text>
          <text id="/enketo_widgets/media_widgets/file:label">
            <value>File widget (any type)</value>
          </text>
          <text id="/enketo_widgets/media_widgets/image:label">
            <value>Image widget</value>
          </text>
          <text id="/enketo_widgets/media_widgets/video:label">
            <value>Video widget</value>
          </text>
          <text id="/enketo_widgets/media_widgets:label">
            <value>Media input widgets</value>
          </text>
          <text id="/enketo_widgets/number_widgets/decimal:label">
            <value>Decimal widget (allows only number &gt; 10.51 and &lt; 18.39)</value>
          </text>
          <text id="/enketo_widgets/number_widgets/int:label">
            <value>Integer widget (try entering a number &gt; 10)</value>
          </text>
          <text id="/enketo_widgets/number_widgets:label">
            <value>Number widgets</value>
          </text>
          <text id="/enketo_widgets/range_widgets/distress:label">
            <value>Distress widget</value>
          </text>
          <text id="/enketo_widgets/range_widgets/range1:label">
            <value>Range widget 1</value>
          </text>
          <text id="/enketo_widgets/range_widgets/range2:label">
            <value>Range widget 2</value>
          </text>
          <text id="/enketo_widgets/range_widgets/range3:label">
            <value>Range widget 3</value>
          </text>
          <text id="/enketo_widgets/range_widgets/range4:label">
            <value>Range picker widget 4</value>
          </text>
          <text id="/enketo_widgets/range_widgets/range5:label">
            <value>Rating widget 5</value>
          </text>
          <text id="/enketo_widgets/range_widgets:label">
            <value>Range widgets</value>
          </text>
          <text id="/enketo_widgets/select_widgets/grid_2_columns/a:label">
            <value form="image">jr://images/a.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/grid_2_columns/b:label">
            <value form="image">jr://images/b.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/grid_2_columns/c:label">
            <value form="image">jr://images/c.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/grid_2_columns/d:label">
            <value form="image">jr://images/d.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/grid_2_columns:label">
            <value>Fixed number of columns (2), and no buttons</value>
          </text>
          <text id="/enketo_widgets/select_widgets/grid_test/a:label">
            <value form="image">jr://images/a.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/grid_test/b:label">
            <value form="image">jr://images/b.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/grid_test:label">
            <value>No buttons</value>
          </text>
          <text id="/enketo_widgets/select_widgets/happy_sad_table/generated_table_list_label_50:label">
            <value>Table with image labels (alternative method)</value>
          </text>
          <text id="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_brian/happy:label">
            <value form="image">jr://images/happy.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_brian/sad:label">
            <value form="image">jr://images/sad.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_brian:label">
            <value>Brian</value>
          </text>
          <text id="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_michael/happy:label">
            <value form="image">jr://images/happy.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_michael/sad:label">
            <value form="image">jr://images/sad.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_michael:label">
            <value>Michael</value>
          </text>
          <text id="/enketo_widgets/select_widgets/happy_sad_table/reserved_name_for_field_list_labels_51/happy:label">
            <value form="image">jr://images/happy.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/happy_sad_table/reserved_name_for_field_list_labels_51/sad:label">
            <value form="image">jr://images/sad.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select/a:label">
            <value>option a</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select/b:label">
            <value>option b</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select/c:label">
            <value>option c</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select/d:label">
            <value>option d</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1/1:label">
            <value>option 1</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1/2:label">
            <value>option 2</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1/3:label">
            <value>option 3</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1/4:label">
            <value>option 4</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1/5:label">
            <value>option 5</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1/6:label">
            <value>option 6</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1/7:label">
            <value>option 7</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1/8:label">
            <value>option 8</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1:label">
            <value>Select one widget</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_autocomplete/king:label">
            <value>kingfisher</value>
            <value form="image">jr://images/kingfisher.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_autocomplete/nut:label">
            <value>nuthatch</value>
            <value form="image">jr://images/nuthatch.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_autocomplete/pig:label">
            <value>pigeon</value>
            <value form="image">jr://images/pigeon.png</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_autocomplete:label">
            <value>Select one autocomplete widget</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_horizontal/1:label">
            <value>option 1</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_horizontal/2:label">
            <value>option 2</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_horizontal/3:label">
            <value>option 3</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_horizontal/4:label">
            <value>option 4</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_horizontal/5:label">
            <value>option 5</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_horizontal/6:label">
            <value>option 6</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_horizontal/7:label">
            <value>option 7</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_horizontal/8:label">
            <value>option 8</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_horizontal:label">
            <value>Select one widget displaying horizontally in columns</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_horizontal_compact/dk:label">
            <value>Don't Know</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_horizontal_compact/na:label">
            <value>Not Applicable</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_horizontal_compact/no:label">
            <value>No</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_horizontal_compact/yes:label">
            <value>Yes</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_horizontal_compact:label">
            <value>Select one widget displaying horizontally</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_likert/1:label">
            <value>strongly disagree</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_likert/2:label">
            <value>disagree</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_likert/3:label">
            <value>neither agree nor disagree</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_likert/4:label">
            <value>agree</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_likert/5:label">
            <value>strongly agree</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_likert:label">
            <value>Select one displaying as a Likert item</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_spinner/a:label">
            <value>option a</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_spinner/b:label">
            <value>option b</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_spinner/c:label">
            <value>option c</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_spinner/d:label">
            <value>option d</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select1_spinner:label">
            <value>Select one: pulldown</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select:label">
            <value>Select multiple widget</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_horizontal/dk:label">
            <value>Don't Know</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_horizontal/na:label">
            <value>Not Applicable</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_horizontal/no:label">
            <value>No</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_horizontal/yes:label">
            <value>Yes</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_horizontal:label">
            <value>Select multiple widget displaying horizontally in columns</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_horizontal_compact/a:label">
            <value>option a</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_horizontal_compact/b:label">
            <value>option b</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_horizontal_compact/c:label">
            <value>option c</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_horizontal_compact/d:label">
            <value>option d</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_horizontal_compact:label">
            <value>Select multiple widget displaying horizontally</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_spinner/a:label">
            <value>option a</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_spinner/b:label">
            <value>option b</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_spinner/c:label">
            <value>option c</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_spinner/d:label">
            <value>option d</value>
          </text>
          <text id="/enketo_widgets/select_widgets/select_spinner:label">
            <value>Select multiple: pulldown</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_1/dk:label">
            <value>Don't Know</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_1/na:label">
            <value>Not Applicable</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_1/no:label">
            <value>No</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_1/yes:label">
            <value>Yes</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_1:label">
            <value>Q1</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_2/dk:label">
            <value>Don't Know</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_2/na:label">
            <value>Not Applicable</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_2/no:label">
            <value>No</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_2/yes:label">
            <value>Yes</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_2:label">
            <value>Question 2</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_test_label/dk:label">
            <value>Don't Know</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_test_label/na:label">
            <value>Not Applicable</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_test_label/no:label">
            <value>No</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_test_label/yes:label">
            <value>Yes</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test/table_list_test_label:label">
            <value>Table</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/generated_table_list_label_46:label">
            <value>Table (alternative method)</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47/dk:label">
            <value>Don't Know</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47/na:label">
            <value>Not Applicable</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47/no:label">
            <value>No</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47/yes:label">
            <value>Yes</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/table_list_3/dk:label">
            <value>Don't Know</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/table_list_3/na:label">
            <value>Not Applicable</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/table_list_3/no:label">
            <value>No</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/table_list_3/yes:label">
            <value>Yes</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/table_list_3:label">
            <value>Q1</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/table_list_4/dk:label">
            <value>Don't Know</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/table_list_4/na:label">
            <value>Not Applicable</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/table_list_4/no:label">
            <value>No</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/table_list_4/yes:label">
            <value>Yes</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test2/table_list_4:label">
            <value>Question 2</value>
          </text>
          <text id="/enketo_widgets/select_widgets/table_list_test:label">
            <value>Table</value>
          </text>
          <text id="/enketo_widgets/select_widgets:label">
            <value>Select widgets</value>
          </text>
          <text id="/enketo_widgets/text_widgets/long_text:label">
            <value>Multiline Text widget in enketo (in ODK collect this a normal text field)</value>
          </text>
          <text id="/enketo_widgets/text_widgets/phone:label">
            <value>Text widget for phonenumber-like input</value>
          </text>
          <text id="/enketo_widgets/text_widgets/text:label">
            <value>Text widget</value>
          </text>
          <text id="/enketo_widgets/text_widgets/url:label">
            <value>URL widget</value>
          </text>
          <text id="/enketo_widgets/text_widgets:label">
            <value>Text widgets</value>
          </text>
          <text id="static_instance-a_b-0">
            <value form="image">jr://images/a.png</value>
          </text>
          <text id="static_instance-a_b-1">
            <value form="image">jr://images/b.png</value>
          </text>
          <text id="static_instance-a_b_c_d-0">
            <value form="image">jr://images/a.png</value>
          </text>
          <text id="static_instance-a_b_c_d-1">
            <value form="image">jr://images/b.png</value>
          </text>
          <text id="static_instance-a_b_c_d-2">
            <value form="image">jr://images/c.png</value>
          </text>
          <text id="static_instance-a_b_c_d-3">
            <value form="image">jr://images/d.png</value>
          </text>
          <text id="static_instance-agree5-0">
            <value>strongly disagree</value>
          </text>
          <text id="static_instance-agree5-1">
            <value>disagree</value>
          </text>
          <text id="static_instance-agree5-2">
            <value>neither agree nor disagree</value>
          </text>
          <text id="static_instance-agree5-3">
            <value>agree</value>
          </text>
          <text id="static_instance-agree5-4">
            <value>strongly agree</value>
          </text>
          <text id="static_instance-cities-0">
            <value>Amsterdam</value>
          </text>
          <text id="static_instance-cities-1">
            <value>Denver</value>
          </text>
          <text id="static_instance-cities-2">
            <value>New York City</value>
          </text>
          <text id="static_instance-cities-3">
            <value>Los Angeles</value>
          </text>
          <text id="static_instance-cities-4">
            <value>Rotterdam</value>
          </text>
          <text id="static_instance-cities-5">
            <value>Dronten</value>
          </text>
          <text id="static_instance-countries-0">
            <value>The Netherlands</value>
          </text>
          <text id="static_instance-countries-1">
            <value>United States</value>
          </text>
          <text id="static_instance-happy_sad-0">
            <value form="image">jr://images/happy.png</value>
          </text>
          <text id="static_instance-happy_sad-1">
            <value form="image">jr://images/sad.png</value>
          </text>
          <text id="static_instance-holiday-0">
            <value>Mexico</value>
          </text>
          <text id="static_instance-holiday-1">
            <value>Costa Rica</value>
          </text>
          <text id="static_instance-holiday-2">
            <value>USA</value>
          </text>
          <text id="static_instance-holiday-3">
            <value>The Netherlands</value>
          </text>
          <text id="static_instance-holiday-4">
            <value>South Africa</value>
          </text>
          <text id="static_instance-holiday-5">
            <value>Maldives</value>
          </text>
          <text id="static_instance-list-0">
            <value>option a</value>
          </text>
          <text id="static_instance-list-1">
            <value>option b</value>
          </text>
          <text id="static_instance-list-2">
            <value>option c</value>
          </text>
          <text id="static_instance-list-3">
            <value>option d</value>
          </text>
          <text id="static_instance-list1-0">
            <value>kingfisher</value>
            <value form="image">jr://images/kingfisher.png</value>
          </text>
          <text id="static_instance-list1-1">
            <value>pigeon</value>
            <value form="image">jr://images/pigeon.png</value>
          </text>
          <text id="static_instance-list1-2">
            <value>nuthatch</value>
            <value form="image">jr://images/nuthatch.png</value>
          </text>
          <text id="static_instance-list2-0">
            <value>option 1</value>
          </text>
          <text id="static_instance-list2-1">
            <value>option 2</value>
          </text>
          <text id="static_instance-list2-2">
            <value>option 3</value>
          </text>
          <text id="static_instance-list2-3">
            <value>option 4</value>
          </text>
          <text id="static_instance-list2-4">
            <value>option 5</value>
          </text>
          <text id="static_instance-list2-5">
            <value>option 6</value>
          </text>
          <text id="static_instance-list2-6">
            <value>option 7</value>
          </text>
          <text id="static_instance-list2-7">
            <value>option 8</value>
          </text>
          <text id="static_instance-neighborhoods-0">
            <value>Bronx</value>
          </text>
          <text id="static_instance-neighborhoods-1">
            <value>Harlem</value>
          </text>
          <text id="static_instance-neighborhoods-2">
            <value>Bel Air</value>
          </text>
          <text id="static_instance-neighborhoods-3">
            <value>Westerpark</value>
          </text>
          <text id="static_instance-neighborhoods-4">
            <value>Park Hill</value>
          </text>
          <text id="static_instance-neighborhoods-5">
            <value>Harbor</value>
          </text>
          <text id="static_instance-neighborhoods-6">
            <value>Dam</value>
          </text>
          <text id="static_instance-neighborhoods-7">
            <value>Downtown</value>
          </text>
          <text id="static_instance-neighborhoods-8">
            <value>Harbor</value>
          </text>
          <text id="static_instance-yes_no-0">
            <value>Yes</value>
          </text>
          <text id="static_instance-yes_no-1">
            <value>No</value>
          </text>
          <text id="static_instance-yes_no-2">
            <value>Don't Know</value>
          </text>
          <text id="static_instance-yes_no-3">
            <value>Not Applicable</value>
          </text>
        </translation>
      </itext>
      <instance>
        <enketo_widgets delimiter="#" id="enketo_widgets" prefix="J1!enketo_widgets!" version="2021-09-24 00:00:00">
          <intro/>
          <text_widgets>
            <text/>
            <phone/>
            <long_text/>
            <url>https://enketo.org</url>
          </text_widgets>
          <number_widgets>
            <int/>
            <decimal>18.31</decimal>
          </number_widgets>
          <range_widgets>
            <range1/>
            <range2/>
            <range3/>
            <range4/>
            <range5/>
            <distress/>
          </range_widgets>
          <date_time_widgets>
            <date>2010-06-15</date>
            <date_month_year/>
            <date_year/>
            <time/>
            <datetime/>
          </date_time_widgets>
          <select_widgets>
            <select>a c</select>
            <select_horizontal/>
            <select_horizontal_compact/>
            <select_spinner/>
            <select1>8</select1>
            <select1_horizontal/>
            <select1_horizontal_compact/>
            <select1_likert/>
            <select1_spinner/>
            <select1_autocomplete/>
            <grid_test/>
            <grid_2_columns/>
            <table_list_test>
              <table_list_test_label/>
              <table_list_1/>
              <table_list_2/>
            </table_list_test>
            <table_list_test2>
              <generated_table_list_label_46/>
              <reserved_name_for_field_list_labels_47/>
              <table_list_3/>
              <table_list_4/>
            </table_list_test2>
            <happy_sad_table>
              <generated_table_list_label_50/>
              <reserved_name_for_field_list_labels_51/>
              <happy_sad_brian/>
              <happy_sad_michael/>
            </happy_sad_table>
          </select_widgets>
          <cascading_widgets>
            <group1>
              <country/>
              <city/>
              <neighborhood/>
            </group1>
            <group2>
              <country2/>
              <city2/>
              <neighborhood2/>
            </group2>
          </cascading_widgets>
          <geopoint_widgets>
            <geopoint_map/>
            <geopoint_hide/>
            <geotrace/>
            <geoshape/>
          </geopoint_widgets>
          <media_widgets>
            <image/>
            <audio/>
            <video/>
            <file/>
          </media_widgets>
          <display_widgets><output/><select_media/>
            <trigger/>
            <calc/>
            <calc_note/>
          </display_widgets>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </enketo_widgets>
      </instance>
      <instance id="contact-summary"/>
      <instance id="list">
        <root>
          <item>
            <itextId>static_instance-list-0</itextId>
            <name>a</name>
          </item>
          <item>
            <itextId>static_instance-list-1</itextId>
            <name>b</name>
          </item>
          <item>
            <itextId>static_instance-list-2</itextId>
            <name>c</name>
          </item>
          <item>
            <itextId>static_instance-list-3</itextId>
            <name>d</name>
          </item>
        </root>
      </instance>
      <instance id="list1">
        <root>
          <item>
            <itextId>static_instance-list1-0</itextId>
            <name>king</name>
          </item>
          <item>
            <itextId>static_instance-list1-1</itextId>
            <name>pig</name>
          </item>
          <item>
            <itextId>static_instance-list1-2</itextId>
            <name>nut</name>
          </item>
        </root>
      </instance>
      <instance id="list2">
        <root>
          <item>
            <itextId>static_instance-list2-0</itextId>
            <name>1</name>
          </item>
          <item>
            <itextId>static_instance-list2-1</itextId>
            <name>2</name>
          </item>
          <item>
            <itextId>static_instance-list2-2</itextId>
            <name>3</name>
          </item>
          <item>
            <itextId>static_instance-list2-3</itextId>
            <name>4</name>
          </item>
          <item>
            <itextId>static_instance-list2-4</itextId>
            <name>5</name>
          </item>
          <item>
            <itextId>static_instance-list2-5</itextId>
            <name>6</name>
          </item>
          <item>
            <itextId>static_instance-list2-6</itextId>
            <name>7</name>
          </item>
          <item>
            <itextId>static_instance-list2-7</itextId>
            <name>8</name>
          </item>
        </root>
      </instance>
      <instance id="yes_no">
        <root>
          <item>
            <itextId>static_instance-yes_no-0</itextId>
            <name>yes</name>
          </item>
          <item>
            <itextId>static_instance-yes_no-1</itextId>
            <name>no</name>
          </item>
          <item>
            <itextId>static_instance-yes_no-2</itextId>
            <name>dk</name>
          </item>
          <item>
            <itextId>static_instance-yes_no-3</itextId>
            <name>na</name>
          </item>
        </root>
      </instance>
      <instance id="agree5">
        <root>
          <item>
            <itextId>static_instance-agree5-0</itextId>
            <name>1</name>
          </item>
          <item>
            <itextId>static_instance-agree5-1</itextId>
            <name>2</name>
          </item>
          <item>
            <itextId>static_instance-agree5-2</itextId>
            <name>3</name>
          </item>
          <item>
            <itextId>static_instance-agree5-3</itextId>
            <name>4</name>
          </item>
          <item>
            <itextId>static_instance-agree5-4</itextId>
            <name>5</name>
          </item>
        </root>
      </instance>
      <instance id="holiday">
        <root>
          <item>
            <itextId>static_instance-holiday-0</itextId>
            <name>a</name>
          </item>
          <item>
            <itextId>static_instance-holiday-1</itextId>
            <name>b</name>
          </item>
          <item>
            <itextId>static_instance-holiday-2</itextId>
            <name>c</name>
          </item>
          <item>
            <itextId>static_instance-holiday-3</itextId>
            <name>d</name>
          </item>
          <item>
            <itextId>static_instance-holiday-4</itextId>
            <name>e</name>
          </item>
          <item>
            <itextId>static_instance-holiday-5</itextId>
            <name>f</name>
          </item>
        </root>
      </instance>
      <instance id="a_b">
        <root>
          <item>
            <itextId>static_instance-a_b-0</itextId>
            <name>a</name>
          </item>
          <item>
            <itextId>static_instance-a_b-1</itextId>
            <name>b</name>
          </item>
        </root>
      </instance>
      <instance id="a_b_c_d">
        <root>
          <item>
            <itextId>static_instance-a_b_c_d-0</itextId>
            <name>a</name>
          </item>
          <item>
            <itextId>static_instance-a_b_c_d-1</itextId>
            <name>b</name>
          </item>
          <item>
            <itextId>static_instance-a_b_c_d-2</itextId>
            <name>c</name>
          </item>
          <item>
            <itextId>static_instance-a_b_c_d-3</itextId>
            <name>d</name>
          </item>
        </root>
      </instance>
      <instance id="happy_sad">
        <root>
          <item>
            <itextId>static_instance-happy_sad-0</itextId>
            <name>happy</name>
          </item>
          <item>
            <itextId>static_instance-happy_sad-1</itextId>
            <name>sad</name>
          </item>
        </root>
      </instance>
      <instance id="countries">
        <root>
          <item>
            <itextId>static_instance-countries-0</itextId>
            <name>nl</name>
          </item>
          <item>
            <itextId>static_instance-countries-1</itextId>
            <name>usa</name>
          </item>
        </root>
      </instance>
      <instance id="cities">
        <root>
          <item>
            <itextId>static_instance-cities-0</itextId>
            <name>ams</name>
            <country>nl</country>
          </item>
          <item>
            <itextId>static_instance-cities-1</itextId>
            <name>den</name>
            <country>usa</country>
          </item>
          <item>
            <itextId>static_instance-cities-2</itextId>
            <name>nyc</name>
            <country>usa</country>
          </item>
          <item>
            <itextId>static_instance-cities-3</itextId>
            <name>la</name>
            <country>usa</country>
          </item>
          <item>
            <itextId>static_instance-cities-4</itextId>
            <name>rot</name>
            <country>nl</country>
          </item>
          <item>
            <itextId>static_instance-cities-5</itextId>
            <name>dro</name>
            <country>nl</country>
          </item>
        </root>
      </instance>
      <instance id="neighborhoods">
        <root>
          <item>
            <itextId>static_instance-neighborhoods-0</itextId>
            <country>usa</country>
            <name>bronx</name>
            <city>nyc</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-1</itextId>
            <country>usa</country>
            <name>harlem</name>
            <city>nyc</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-2</itextId>
            <country>usa</country>
            <name>belair</name>
            <city>la</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-3</itextId>
            <country>nl</country>
            <name>wes</name>
            <city>ams</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-4</itextId>
            <country>usa</country>
            <name>parkhill</name>
            <city>den</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-5</itextId>
            <country>nl</country>
            <name>haven</name>
            <city>rot</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-6</itextId>
            <country>nl</country>
            <name>dam</name>
            <city>ams</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-7</itextId>
            <country>nl</country>
            <name>centrum</name>
            <city>rot</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-8</itextId>
            <country>nl</country>
            <name>havendr</name>
            <city>dro</city>
          </item>
        </root>
      </instance>
      <bind nodeset="/enketo_widgets/intro" readonly="true()" type="string"/>
      <bind nodeset="/enketo_widgets/text_widgets/text" type="string"/>
      <bind nodeset="/enketo_widgets/text_widgets/phone" type="string"/>
      <bind nodeset="/enketo_widgets/text_widgets/long_text" type="string"/>
      <bind nodeset="/enketo_widgets/text_widgets/url" readonly="true()" type="string"/>
      <bind constraint=". &lt; 10" nodeset="/enketo_widgets/number_widgets/int" type="int"/>
      <bind constraint=". &gt; 10.51 and . &lt; 18.39" nodeset="/enketo_widgets/number_widgets/decimal" type="decimal"/>
      <bind nodeset="/enketo_widgets/range_widgets/range1" type="int"/>
      <bind nodeset="/enketo_widgets/range_widgets/range2" type="decimal"/>
      <bind nodeset="/enketo_widgets/range_widgets/range3" type="int"/>
      <bind nodeset="/enketo_widgets/range_widgets/range4" type="int"/>
      <bind nodeset="/enketo_widgets/range_widgets/range5" type="int"/>
      <bind nodeset="/enketo_widgets/range_widgets/distress" type="int"/>
      <bind nodeset="/enketo_widgets/date_time_widgets/date" type="date"/>
      <bind nodeset="/enketo_widgets/date_time_widgets/date_month_year" type="date"/>
      <bind nodeset="/enketo_widgets/date_time_widgets/date_year" type="date"/>
      <bind nodeset="/enketo_widgets/date_time_widgets/time" type="time"/>
      <bind nodeset="/enketo_widgets/date_time_widgets/datetime" type="dateTime"/>
      <bind constraint="not(selected(., 'c') and selected(., 'd'))" nodeset="/enketo_widgets/select_widgets/select" type="select"/>
      <bind nodeset="/enketo_widgets/select_widgets/select_horizontal" type="select"/>
      <bind nodeset="/enketo_widgets/select_widgets/select_horizontal_compact" type="select"/>
      <bind nodeset="/enketo_widgets/select_widgets/select_spinner" type="select"/>
      <bind nodeset="/enketo_widgets/select_widgets/select1" type="select1"/>
      <bind nodeset="/enketo_widgets/select_widgets/select1_horizontal" type="select1"/>
      <bind nodeset="/enketo_widgets/select_widgets/select1_horizontal_compact" type="select1"/>
      <bind nodeset="/enketo_widgets/select_widgets/select1_likert" type="select1"/>
      <bind nodeset="/enketo_widgets/select_widgets/select1_spinner" type="select1"/>
      <bind nodeset="/enketo_widgets/select_widgets/select1_autocomplete" type="select1"/>
      <bind nodeset="/enketo_widgets/select_widgets/grid_test" type="select1"/>
      <bind nodeset="/enketo_widgets/select_widgets/grid_2_columns" type="select1"/>
      <bind nodeset="/enketo_widgets/select_widgets/table_list_test/table_list_test_label" type="select1"/>
      <bind nodeset="/enketo_widgets/select_widgets/table_list_test/table_list_1" type="select1"/>
      <bind nodeset="/enketo_widgets/select_widgets/table_list_test/table_list_2" type="select1"/>
      <bind nodeset="/enketo_widgets/select_widgets/table_list_test2/generated_table_list_label_46" readonly="true()" type="string"/>
      <bind nodeset="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47" type="select1"/>
      <bind nodeset="/enketo_widgets/select_widgets/table_list_test2/table_list_3" type="select1"/>
      <bind nodeset="/enketo_widgets/select_widgets/table_list_test2/table_list_4" type="select1"/>
      <bind nodeset="/enketo_widgets/select_widgets/happy_sad_table/generated_table_list_label_50" readonly="true()" type="string"/>
      <bind nodeset="/enketo_widgets/select_widgets/happy_sad_table/reserved_name_for_field_list_labels_51" type="select"/>
      <bind nodeset="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_brian" type="select"/>
      <bind nodeset="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_michael" type="select"/>
      <bind nodeset="/enketo_widgets/cascading_widgets/group1/country" type="select1"/>
      <bind nodeset="/enketo_widgets/cascading_widgets/group1/city" type="select1"/>
      <bind nodeset="/enketo_widgets/cascading_widgets/group1/neighborhood" type="select1"/>
      <bind nodeset="/enketo_widgets/cascading_widgets/group2/country2" type="select1"/>
      <bind nodeset="/enketo_widgets/cascading_widgets/group2/city2" type="select1"/>
      <bind nodeset="/enketo_widgets/cascading_widgets/group2/neighborhood2" type="select1"/>
      <bind nodeset="/enketo_widgets/geopoint_widgets/geopoint_map" type="geopoint"/>
      <bind nodeset="/enketo_widgets/geopoint_widgets/geopoint_hide" type="geopoint"/>
      <bind nodeset="/enketo_widgets/geopoint_widgets/geotrace" type="geotrace"/>
      <bind nodeset="/enketo_widgets/geopoint_widgets/geoshape" type="geoshape"/>
      <bind nodeset="/enketo_widgets/media_widgets/image" type="binary"/>
      <bind nodeset="/enketo_widgets/media_widgets/audio" type="binary"/>
      <bind nodeset="/enketo_widgets/media_widgets/video" type="binary"/>
      <bind nodeset="/enketo_widgets/media_widgets/file" type="binary"/>
      <bind nodeset="/enketo_widgets/display_widgets/output" readonly="true()" type="string"/>
      <bind nodeset="/enketo_widgets/display_widgets/select_media" type="select1"/>
      <bind calculate=" /enketo_widgets/number_widgets/decimal +3" nodeset="/enketo_widgets/display_widgets/calc" type="string"/>
      <bind nodeset="/enketo_widgets/display_widgets/calc_note" readonly="true()" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/enketo_widgets/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <input ref="/enketo_widgets/intro">
      <label ref="jr:itext('/enketo_widgets/intro:label')"/>
    </input>
    <group appearance="field-list" ref="/enketo_widgets/text_widgets">
      <label ref="jr:itext('/enketo_widgets/text_widgets:label')"/>
      <input ref="/enketo_widgets/text_widgets/text">
        <label ref="jr:itext('/enketo_widgets/text_widgets/text:label')"/>
        <hint>Can be short or long but always one line (type = text)</hint>
      </input>
      <input appearance="numbers" ref="/enketo_widgets/text_widgets/phone">
        <label ref="jr:itext('/enketo_widgets/text_widgets/phone:label')"/>
        <hint>This is a text input that will show the numbers keyboard on mobile devices (type=text, appearance=numbers)</hint>
      </input>
      <input appearance="multiline" ref="/enketo_widgets/text_widgets/long_text">
        <label ref="jr:itext('/enketo_widgets/text_widgets/long_text:label')"/>
        <hint>Can be multiple lines (type=text, appearance=multiline)</hint>
      </input>
      <input appearance="url" ref="/enketo_widgets/text_widgets/url">
        <label ref="jr:itext('/enketo_widgets/text_widgets/url:label')"/>
      </input>
    </group>
    <group appearance="field-list" ref="/enketo_widgets/number_widgets">
      <label ref="jr:itext('/enketo_widgets/number_widgets:label')"/>
      <input ref="/enketo_widgets/number_widgets/int">
        <label ref="jr:itext('/enketo_widgets/number_widgets/int:label')"/>
        <hint>This field has a constraint (type=integer, constraint=.&lt;10)</hint>
      </input>
      <input ref="/enketo_widgets/number_widgets/decimal">
        <label ref="jr:itext('/enketo_widgets/number_widgets/decimal:label')"/>
        <hint>This field has a constraint (type=decimal, constraint=. &gt; 10.51 and . &lt; 18.39)</hint>
      </input>
    </group>
    <group appearance="field-list" ref="/enketo_widgets/range_widgets">
      <label ref="jr:itext('/enketo_widgets/range_widgets:label')"/>
      <range end="5" ref="/enketo_widgets/range_widgets/range1" start="0" step="1">
        <label ref="jr:itext('/enketo_widgets/range_widgets/range1:label')"/>
        <hint>A horizontal range widget (type=range)</hint>
      </range>
      <range appearance="vertical" end="2" ref="/enketo_widgets/range_widgets/range2" start="0" step="0.1">
        <label ref="jr:itext('/enketo_widgets/range_widgets/range2:label')"/>
        <hint>A vertical range widget (type=range, appearance=vertical)</hint>
      </range>
      <range appearance="no-ticks" end="5" ref="/enketo_widgets/range_widgets/range3" start="0" step="1">
        <label ref="jr:itext('/enketo_widgets/range_widgets/range3:label')"/>
        <hint>A horizontal range widget without ticks (type=range, appearance=no-ticks)</hint>
      </range>
      <range appearance="picker" end="5" ref="/enketo_widgets/range_widgets/range4" start="0" step="1">
        <label ref="jr:itext('/enketo_widgets/range_widgets/range4:label')"/>
        <hint>A horizontal range widget without ticks (type=range, appearance=picker)</hint>
      </range>
      <range appearance="rating" end="5" ref="/enketo_widgets/range_widgets/range5" start="0" step="1">
        <label ref="jr:itext('/enketo_widgets/range_widgets/range5:label')"/>
        <hint>A horizontal range widget without ticks (type=range, appearance=rating)</hint>
      </range>
      <range appearance="distress" end="10" ref="/enketo_widgets/range_widgets/distress" start="1" step="1">
        <label ref="jr:itext('/enketo_widgets/range_widgets/distress:label')"/>
        <hint>A highly specific widget to measure distress(type=range, appearance=distress)</hint>
      </range>
    </group>
    <group appearance="field-list" ref="/enketo_widgets/date_time_widgets">
      <label ref="jr:itext('/enketo_widgets/date_time_widgets:label')"/>
      <input ref="/enketo_widgets/date_time_widgets/date">
        <label ref="jr:itext('/enketo_widgets/date_time_widgets/date:label')"/>
      </input>
      <input appearance="month-year" ref="/enketo_widgets/date_time_widgets/date_month_year">
        <label ref="jr:itext('/enketo_widgets/date_time_widgets/date_month_year:label')"/>
        <hint>Simply specify an appearance style (type=date, appearance=month-year)</hint>
      </input>
      <input appearance="year" ref="/enketo_widgets/date_time_widgets/date_year">
        <label ref="jr:itext('/enketo_widgets/date_time_widgets/date_year:label')"/>
        <hint>Simply specify and appearance style (type=date, appearance=year)</hint>
      </input>
      <input ref="/enketo_widgets/date_time_widgets/time">
        <label ref="jr:itext('/enketo_widgets/date_time_widgets/time:label')"/>
        <hint>Times are easy! (type=time)</hint>
      </input>
      <input ref="/enketo_widgets/date_time_widgets/datetime">
        <label ref="jr:itext('/enketo_widgets/date_time_widgets/datetime:label')"/>
        <hint>For exact times, will be converted to UTC/GMT (type=dateTime)</hint>
      </input>
    </group>
    <group appearance="field-list" ref="/enketo_widgets/select_widgets">
      <label ref="jr:itext('/enketo_widgets/select_widgets:label')"/>
      <select ref="/enketo_widgets/select_widgets/select">
        <label ref="jr:itext('/enketo_widgets/select_widgets/select:label')"/>
        <hint>Using a list specified in the choices worksheet (type=select_multiple)</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select/a:label')"/>
          <value>a</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select/b:label')"/>
          <value>b</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select/c:label')"/>
          <value>c</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select/d:label')"/>
          <value>d</value>
        </item>
      </select>
      <select appearance="columns" ref="/enketo_widgets/select_widgets/select_horizontal">
        <label ref="jr:itext('/enketo_widgets/select_widgets/select_horizontal:label')"/>
        <hint>(type=select_multiple, appearance=columns)</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select_horizontal/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select_horizontal/no:label')"/>
          <value>no</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select_horizontal/dk:label')"/>
          <value>dk</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select_horizontal/na:label')"/>
          <value>na</value>
        </item>
      </select>
      <select appearance="columns-pack" ref="/enketo_widgets/select_widgets/select_horizontal_compact">
        <label ref="jr:itext('/enketo_widgets/select_widgets/select_horizontal_compact:label')"/>
        <hint>(type=select_multiple, appearance=columns-pack)</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select_horizontal_compact/a:label')"/>
          <value>a</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select_horizontal_compact/b:label')"/>
          <value>b</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select_horizontal_compact/c:label')"/>
          <value>c</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select_horizontal_compact/d:label')"/>
          <value>d</value>
        </item>
      </select>
      <select appearance="minimal" ref="/enketo_widgets/select_widgets/select_spinner">
        <label ref="jr:itext('/enketo_widgets/select_widgets/select_spinner:label')"/>
        <hint>Showing a pull-down list of options (type=select_multiple list, appearance=minimal)</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select_spinner/a:label')"/>
          <value>a</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select_spinner/b:label')"/>
          <value>b</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select_spinner/c:label')"/>
          <value>c</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select_spinner/d:label')"/>
          <value>d</value>
        </item>
      </select>
      <select1 ref="/enketo_widgets/select_widgets/select1">
        <label ref="jr:itext('/enketo_widgets/select_widgets/select1:label')"/>
        <hint>This one has default value (type=select_one)</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1/1:label')"/>
          <value>1</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1/2:label')"/>
          <value>2</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1/3:label')"/>
          <value>3</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1/4:label')"/>
          <value>4</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1/5:label')"/>
          <value>5</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1/6:label')"/>
          <value>6</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1/7:label')"/>
          <value>7</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1/8:label')"/>
          <value>8</value>
        </item>
      </select1>
      <select1 appearance="columns" ref="/enketo_widgets/select_widgets/select1_horizontal">
        <label ref="jr:itext('/enketo_widgets/select_widgets/select1_horizontal:label')"/>
        <hint>(type=select_one, appearance=columns)</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_horizontal/1:label')"/>
          <value>1</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_horizontal/2:label')"/>
          <value>2</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_horizontal/3:label')"/>
          <value>3</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_horizontal/4:label')"/>
          <value>4</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_horizontal/5:label')"/>
          <value>5</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_horizontal/6:label')"/>
          <value>6</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_horizontal/7:label')"/>
          <value>7</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_horizontal/8:label')"/>
          <value>8</value>
        </item>
      </select1>
      <select1 appearance="columns-pack no-buttons" ref="/enketo_widgets/select_widgets/select1_horizontal_compact">
        <label ref="jr:itext('/enketo_widgets/select_widgets/select1_horizontal_compact:label')"/>
        <hint>(type=select_one, appearance=columns-pack no-buttons)</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_horizontal_compact/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_horizontal_compact/no:label')"/>
          <value>no</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_horizontal_compact/dk:label')"/>
          <value>dk</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_horizontal_compact/na:label')"/>
          <value>na</value>
        </item>
      </select1>
      <select1 appearance="likert" ref="/enketo_widgets/select_widgets/select1_likert">
        <label ref="jr:itext('/enketo_widgets/select_widgets/select1_likert:label')"/>
        <hint>(type=select_one, appearance=likert)</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_likert/1:label')"/>
          <value>1</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_likert/2:label')"/>
          <value>2</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_likert/3:label')"/>
          <value>3</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_likert/4:label')"/>
          <value>4</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_likert/5:label')"/>
          <value>5</value>
        </item>
      </select1>
      <select1 appearance="minimal" ref="/enketo_widgets/select_widgets/select1_spinner">
        <label ref="jr:itext('/enketo_widgets/select_widgets/select1_spinner:label')"/>
        <hint>Showing a pull-down list of options (type=select_one list, appearance=minimal)</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_spinner/a:label')"/>
          <value>a</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_spinner/b:label')"/>
          <value>b</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_spinner/c:label')"/>
          <value>c</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_spinner/d:label')"/>
          <value>d</value>
        </item>
      </select1>
      <select1 appearance="autocomplete" ref="/enketo_widgets/select_widgets/select1_autocomplete">
        <label ref="jr:itext('/enketo_widgets/select_widgets/select1_autocomplete:label')"/>
        <hint>Type e.g. 'g' to filter options.
(type=select_one, appearance=autocomplete)</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_autocomplete/king:label')"/>
          <value>king</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_autocomplete/pig:label')"/>
          <value>pig</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/select1_autocomplete/nut:label')"/>
          <value>nut</value>
        </item>
      </select1>
      <select1 appearance="no-buttons" ref="/enketo_widgets/select_widgets/grid_test">
        <label ref="jr:itext('/enketo_widgets/select_widgets/grid_test:label')"/>
        <hint>Make sure to put a.png and b.png in the impages folder to see images here. (type=select_one, appearance=no-buttons)</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/grid_test/a:label')"/>
          <value>a</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/grid_test/b:label')"/>
          <value>b</value>
        </item>
      </select1>
      <select1 appearance="columns-2 no-buttons" ref="/enketo_widgets/select_widgets/grid_2_columns">
        <label ref="jr:itext('/enketo_widgets/select_widgets/grid_2_columns:label')"/>
        <hint>Grid with a maximum of 2 columns. (type=select_one a_b, appearance=columns-2 no-buttons)</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/grid_2_columns/a:label')"/>
          <value>a</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/grid_2_columns/b:label')"/>
          <value>b</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/grid_2_columns/c:label')"/>
          <value>c</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/select_widgets/grid_2_columns/d:label')"/>
          <value>d</value>
        </item>
      </select1>
      <group appearance="field-list" ref="/enketo_widgets/select_widgets/table_list_test">
        <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test:label')"/>
        <select1 appearance="label" ref="/enketo_widgets/select_widgets/table_list_test/table_list_test_label">
          <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_test_label:label')"/>
          <hint>Show only the labels of these options and not the inputs (type=select_one yes_no, appearance=label)</hint>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_test_label/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_test_label/no:label')"/>
            <value>no</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_test_label/dk:label')"/>
            <value>dk</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_test_label/na:label')"/>
            <value>na</value>
          </item>
        </select1>
        <select1 appearance="list-nolabel" ref="/enketo_widgets/select_widgets/table_list_test/table_list_1">
          <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_1:label')"/>
          <hint>Show only the inputs of these options and not the labels (type=select_one yes_no, appearance=list-nolabel)</hint>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_1/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_1/no:label')"/>
            <value>no</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_1/dk:label')"/>
            <value>dk</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_1/na:label')"/>
            <value>na</value>
          </item>
        </select1>
        <select1 appearance="list-nolabel" ref="/enketo_widgets/select_widgets/table_list_test/table_list_2">
          <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_2:label')"/>
          <hint>Show only the inputs of these options and not the labels (type=select_one yes_no, appearance=list-nolabel)</hint>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_2/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_2/no:label')"/>
            <value>no</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_2/dk:label')"/>
            <value>dk</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test/table_list_2/na:label')"/>
            <value>na</value>
          </item>
        </select1>
      </group>
      <group appearance="field-list" ref="/enketo_widgets/select_widgets/table_list_test2">
        <input ref="/enketo_widgets/select_widgets/table_list_test2/generated_table_list_label_46">
          <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/generated_table_list_label_46:label')"/>
        </input>
        <select1 appearance="label" ref="/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47">
          <label></label>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47/no:label')"/>
            <value>no</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47/dk:label')"/>
            <value>dk</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/reserved_name_for_field_list_labels_47/na:label')"/>
            <value>na</value>
          </item>
        </select1>
        <select1 appearance="list-nolabel" ref="/enketo_widgets/select_widgets/table_list_test2/table_list_3">
          <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/table_list_3:label')"/>
          <hint>No need to do anything special here</hint>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/table_list_3/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/table_list_3/no:label')"/>
            <value>no</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/table_list_3/dk:label')"/>
            <value>dk</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/table_list_3/na:label')"/>
            <value>na</value>
          </item>
        </select1>
        <select1 appearance="list-nolabel" ref="/enketo_widgets/select_widgets/table_list_test2/table_list_4">
          <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/table_list_4:label')"/>
          <hint>No need to do anything special here</hint>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/table_list_4/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/table_list_4/no:label')"/>
            <value>no</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/table_list_4/dk:label')"/>
            <value>dk</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/table_list_test2/table_list_4/na:label')"/>
            <value>na</value>
          </item>
        </select1>
      </group>
      <group appearance="field-list" ref="/enketo_widgets/select_widgets/happy_sad_table">
        <input ref="/enketo_widgets/select_widgets/happy_sad_table/generated_table_list_label_50">
          <label ref="jr:itext('/enketo_widgets/select_widgets/happy_sad_table/generated_table_list_label_50:label')"/>
        </input>
        <select appearance="label" ref="/enketo_widgets/select_widgets/happy_sad_table/reserved_name_for_field_list_labels_51">
          <label></label>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/happy_sad_table/reserved_name_for_field_list_labels_51/happy:label')"/>
            <value>happy</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/happy_sad_table/reserved_name_for_field_list_labels_51/sad:label')"/>
            <value>sad</value>
          </item>
        </select>
        <select appearance="list-nolabel" ref="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_brian">
          <label ref="jr:itext('/enketo_widgets/select_widgets/happy_sad_table/happy_sad_brian:label')"/>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/happy_sad_table/happy_sad_brian/happy:label')"/>
            <value>happy</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/happy_sad_table/happy_sad_brian/sad:label')"/>
            <value>sad</value>
          </item>
        </select>
        <select appearance="list-nolabel" ref="/enketo_widgets/select_widgets/happy_sad_table/happy_sad_michael">
          <label ref="jr:itext('/enketo_widgets/select_widgets/happy_sad_table/happy_sad_michael:label')"/>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/happy_sad_table/happy_sad_michael/happy:label')"/>
            <value>happy</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/select_widgets/happy_sad_table/happy_sad_michael/sad:label')"/>
            <value>sad</value>
          </item>
        </select>
      </group>
    </group>
    <group appearance="field-list" ref="/enketo_widgets/cascading_widgets">
      <label ref="jr:itext('/enketo_widgets/cascading_widgets:label')"/>
      <group ref="/enketo_widgets/cascading_widgets/group1">
        <label ref="jr:itext('/enketo_widgets/cascading_widgets/group1:label')"/>
        <select1 ref="/enketo_widgets/cascading_widgets/group1/country">
          <label ref="jr:itext('/enketo_widgets/cascading_widgets/group1/country:label')"/>
          <item>
            <label ref="jr:itext('/enketo_widgets/cascading_widgets/group1/country/nl:label')"/>
            <value>nl</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/cascading_widgets/group1/country/usa:label')"/>
            <value>usa</value>
          </item>
        </select1>
        <select1 ref="/enketo_widgets/cascading_widgets/group1/city">
          <label ref="jr:itext('/enketo_widgets/cascading_widgets/group1/city:label')"/>
          <hint>Using a choice filter to update options based on a previous answer (choice_filter: country = <output value=" /enketo_widgets/cascading_widgets/group1/country "/>)</hint>
          <itemset nodeset="instance('cities')/root/item[country= /enketo_widgets/cascading_widgets/group1/country ]">
            <value ref="name"/>
            <label ref="jr:itext(itextId)"/>
          </itemset>
        </select1>
        <select1 ref="/enketo_widgets/cascading_widgets/group1/neighborhood">
          <label ref="jr:itext('/enketo_widgets/cascading_widgets/group1/neighborhood:label')"/>
          <hint>Using a choice filter to update options based on previous answers (choice_filter: country = <output value=" /enketo_widgets/cascading_widgets/group1/country "/> and city = <output value=" /enketo_widgets/cascading_widgets/group1/city "/>)</hint>
          <itemset nodeset="instance('neighborhoods')/root/item[country= /enketo_widgets/cascading_widgets/group1/country  and city= /enketo_widgets/cascading_widgets/group1/city ]">
            <value ref="name"/>
            <label ref="jr:itext(itextId)"/>
          </itemset>
        </select1>
      </group>
      <group ref="/enketo_widgets/cascading_widgets/group2">
        <label ref="jr:itext('/enketo_widgets/cascading_widgets/group2:label')"/>
        <select1 appearance="minimal" ref="/enketo_widgets/cascading_widgets/group2/country2">
          <label ref="jr:itext('/enketo_widgets/cascading_widgets/group2/country2:label')"/>
          <hint>(appearance: minimal)</hint>
          <item>
            <label ref="jr:itext('/enketo_widgets/cascading_widgets/group2/country2/nl:label')"/>
            <value>nl</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/cascading_widgets/group2/country2/usa:label')"/>
            <value>usa</value>
          </item>
        </select1>
        <select1 appearance="minimal" ref="/enketo_widgets/cascading_widgets/group2/city2">
          <label ref="jr:itext('/enketo_widgets/cascading_widgets/group2/city2:label')"/>
          <hint>Using a choice filter to update options based on a previous answer (choice_filter: country = <output value=" /enketo_widgets/cascading_widgets/group2/country2 "/>, appearance: minimal)</hint>
          <itemset nodeset="instance('cities')/root/item[country= /enketo_widgets/cascading_widgets/group2/country2 ]">
            <value ref="name"/>
            <label ref="jr:itext(itextId)"/>
          </itemset>
        </select1>
        <select1 appearance="minimal" ref="/enketo_widgets/cascading_widgets/group2/neighborhood2">
          <label ref="jr:itext('/enketo_widgets/cascading_widgets/group2/neighborhood2:label')"/>
          <hint>Using a choice filter to update options based on previous answers (choice_filter: country = <output value=" /enketo_widgets/cascading_widgets/group2/country2 "/> and city = <output value=" /enketo_widgets/cascading_widgets/group2/city2 "/>, appearance = minimal)</hint>
          <itemset nodeset="instance('neighborhoods')/root/item[country= /enketo_widgets/cascading_widgets/group2/country2  and city= /enketo_widgets/cascading_widgets/group2/city2 ]">
            <value ref="name"/>
            <label ref="jr:itext(itextId)"/>
          </itemset>
        </select1>
      </group>
    </group>
    <group appearance="field-list" ref="/enketo_widgets/geopoint_widgets">
      <label ref="jr:itext('/enketo_widgets/geopoint_widgets:label')"/>
      <input appearance="maps" ref="/enketo_widgets/geopoint_widgets/geopoint_map">
        <label ref="jr:itext('/enketo_widgets/geopoint_widgets/geopoint_map:label')"/>
        <hint>Record the gps location (type=geopoint, appearance=maps)</hint>
      </input>
      <input appearance="maps hide-input" ref="/enketo_widgets/geopoint_widgets/geopoint_hide">
        <label ref="jr:itext('/enketo_widgets/geopoint_widgets/geopoint_hide:label')"/>
        <hint>Show a larger map (on desktop screens), you can hide the input fields. (appearance=hide-input)</hint>
      </input>
      <input appearance="maps hide-input" ref="/enketo_widgets/geopoint_widgets/geotrace">
        <label ref="jr:itext('/enketo_widgets/geopoint_widgets/geotrace:label')"/>
        <hint>Record a sequence of geopoints (type=geotrace, appearance=maps hide-input)</hint>
      </input>
      <input appearance="maps hide-input" ref="/enketo_widgets/geopoint_widgets/geoshape">
        <label ref="jr:itext('/enketo_widgets/geopoint_widgets/geoshape:label')"/>
        <hint>Record a closed sequence/polygon of geopoints (type=geoshape, appearance=maps hide-input)</hint>
      </input>
    </group>
    <group appearance="field-list" ref="/enketo_widgets/media_widgets">
      <label ref="jr:itext('/enketo_widgets/media_widgets:label')"/>
      <upload mediatype="image/*" ref="/enketo_widgets/media_widgets/image">
        <label ref="jr:itext('/enketo_widgets/media_widgets/image:label')"/>
        <hint>Select an image or take a photo (type=image)</hint>
      </upload>
      <upload mediatype="audio/*" ref="/enketo_widgets/media_widgets/audio">
        <label ref="jr:itext('/enketo_widgets/media_widgets/audio:label')"/>
        <hint>Select an audio file or record audio (type=audio)</hint>
      </upload>
      <upload mediatype="video/*" ref="/enketo_widgets/media_widgets/video">
        <label ref="jr:itext('/enketo_widgets/media_widgets/video:label')"/>
        <hint>Select a video file or record a video (type=video)</hint>
      </upload>
      <upload mediatype="text/plain,application/pdf,application/vnd.ms-excel,application/msword,text/richtext,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/x-zip,application/x-zip-compressed" ref="/enketo_widgets/media_widgets/file">
        <label ref="jr:itext('/enketo_widgets/media_widgets/file:label')"/>
        <hint>Select any file (no previews)</hint>
      </upload>
    </group>
    <group appearance="field-list" ref="/enketo_widgets/display_widgets">
      <label ref="jr:itext('/enketo_widgets/display_widgets:label')"/>
      <input ref="/enketo_widgets/display_widgets/output">
        <label ref="jr:itext('/enketo_widgets/display_widgets/output:label')"/>
        <hint>This is a note and it uses a value of another field in its label (type=note)</hint>
      </input>
      <select1 ref="/enketo_widgets/display_widgets/select_media">
        <label ref="jr:itext('/enketo_widgets/display_widgets/select_media:label')"/>
        <hint>Add the file name in the image column on your choices sheet. Make sure you upload this file when you publish your form.</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/display_widgets/select_media/king:label')"/>
          <value>king</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/display_widgets/select_media/pig:label')"/>
          <value>pig</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/display_widgets/select_media/nut:label')"/>
          <value>nut</value>
        </item>
      </select1>
      <trigger ref="/enketo_widgets/display_widgets/trigger">
        <label ref="jr:itext('/enketo_widgets/display_widgets/trigger:label')"/>
        <hint>Prompts for confirmation. Useful to combine with required or relevant. (type=trigger)</hint>
      </trigger>
      <input ref="/enketo_widgets/display_widgets/calc_note">
        <label ref="jr:itext('/enketo_widgets/display_widgets/calc_note:label')"/>
        <hint>Calculations are very powerful feature. They are not only used for displaying results but can also be used in skip logic and validation.</hint>
      </input>
    </group>
  </h:body>
</h:html>
  `
};

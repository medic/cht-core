@Kujua = {}
@Kujua.Clinic = Backbone.Model.extend({})

@Kujua.ClinicList = Backbone.Collection.extend(
  model: Kujua.Clinic
  comparator: (clinic) ->
    clinic.get('name')
  parse: (response) ->
    response.rows
  url: ->
    'clinics.json'
)

@Kujua.ClinicView = Backbone.View.extend(
  tagName: 'li'
  events:
    'click a': 'select'
  initialize: (options) ->
    { @parent } = options
    @model.bind('change', @render, @)
    @model.bind('destroy', @remove, @)
  render: ->
    { contact, name } = @model.get('doc')
    { phone, rc_code } = contact
    if not name
        name = ''
    if not rc_code
        rc_code = ''
    if not phone
        phone = 'undefined'
    @$el.html("""
      <a href="#">#{name} #{rc_code} (#{phone})</a>
    """)
    @
  select: ->
    @parent.trigger('update', @model.get('doc'))
    false
)

@Kujua.ClinicsView = Backbone.View.extend(
  initialize: (options) ->
    @data = options.data
    { @_id, @_rev } = @data
    @make()
    div = $('.container > .content > .clinics-view')
    if div.length
        div.replaceWith(@el)
    else
        $('.container > .content').append(@el)
    @clinics = new Kujua.ClinicList()
    if options.url 
        @clinics.url = options.url
    @clinics.bind('reset', @addAll, @)
    @render()
    @clinics.fetch()
    @bind('update', @onUpdate, @)
  className: 'clinics-view'
  onUpdate: (clinic) ->
    record = _.extend({}, @data)
    record.related_entities?.clinic = clinic
    record.reported_date = new Date(record.reported_date).getTime()
    delete record._key
    delete record.fields
    $(document).trigger('save-record', record)
    @$el.find('.modal').modal('hide')
    @remove()
  addAll: ->
    @clinics.each((clinic) ->
      @$list.append(new Kujua.ClinicView(parent: @, model: clinic).render().el)
    , @)
  render: ->
    { _id, _rev, related_entities } = @data
    clinic_name = related_entities?.clinic?.name or 'No Clinic'
    @$el.html("""
      <form id="#{_id}" action="" method="POST" class="hide modal fade">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal">×</button>
          <h3>Update Record</h3>
        </div>
        <div class="modal-body">
          <div class="btn-group">
            <a class="btn dropdown-toggle" data-toggle="dropdown" href="#">
              Clinic: #{clinic_name}
              <span class="caret"></span>
            </a>
            <ul class="dropdown-menu">
            </ul>
          </div>
        </div>
      </form>
    """)
    @$list = @$('ul')
    @$clinic_name = @$('a.dropdown-toggle')
    @$el.find('.modal').modal('show')
    @
)

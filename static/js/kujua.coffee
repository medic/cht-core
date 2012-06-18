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
    { contact, name } = @model.get('value')
    { phone } = contact
    @$el.html("""
      <a href="#">#{name} (#{phone})</a>
    """)
    @
  select: ->
    @parent.trigger('update', @model.get('value'))
)

@Kujua.ClinicsView = Backbone.View.extend(
  initialize: (options) ->
    @data = options.data
    { @_id, @_rev } = @data
    @make()
    $('.container > .content').append(@el)
    @clinics = new Kujua.ClinicList()
    @clinics.bind('reset', @addAll, @)
    @render()
    @clinics.fetch()
    @bind('update', @onUpdate, @)
  onUpdate: (clinic) ->
    record = _.extend({}, @data)
    record.related_entities?.clinic = clinic
    delete record._key
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

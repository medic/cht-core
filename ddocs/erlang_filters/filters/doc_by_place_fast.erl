fun ({Doc}, {Req}) ->
  WhoCanSeeThisDoc = proplists:get_value(<<"whoCanSeeThisDoc">>, Doc),
  case WhoCanSeeThisDoc =/= undefined of
    true ->
      QueryId = proplists:get_value(<<"id">>, element(1, proplists:get_value(<<"query">>, Req, []))),
      case QueryId =:= undefined of
        true ->
          lists:member(<<"all">>, WhoCanSeeThisDoc) or
          lists:member(<<"admin">>, WhoCanSeeThisDoc);
        false ->
          Unassigned = proplists:get_value(<<"unassigned">>, element(1, proplists:get_value(<<"query">>, Req, []))),
          case Unassigned =:= <<"true">> of
            true ->
              lists:member(<<"all">>, WhoCanSeeThisDoc) or
              lists:member(<<"unassigned">>, WhoCanSeeThisDoc) or
              lists:member(QueryId, WhoCanSeeThisDoc);
            false ->
              lists:member(<<"all">>, WhoCanSeeThisDoc) or
              lists:member(QueryId, WhoCanSeeThisDoc)
          end
      end;
    false -> false
  end
end.
